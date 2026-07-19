<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Customer::class);

        $query = Customer::query()->withCount('meetings');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 15));

        return $this->success([
            'items' => CustomerResource::collection($customers->items()),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(StoreCustomerRequest $request)
    {
        $this->authorize('create', Customer::class);

        $customer = Customer::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return $this->success(new CustomerResource($customer), 'Nasabah berhasil ditambahkan.', 201);
    }

    public function show(Customer $customer)
    {
        $this->authorize('view', $customer);

        $customer->load(['creator', 'meetings' => fn ($q) => $q->with('staff')->orderByDesc('scheduled_at')]);

        return $this->success(new CustomerResource($customer));
    }

    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        $this->authorize('update', $customer);

        $customer->update($request->validated());

        return $this->success(new CustomerResource($customer), 'Data nasabah berhasil diperbarui.');
    }

    public function destroy(Customer $customer)
    {
        $this->authorize('delete', $customer);

        // meetings.customer_id cascades on delete — hard-deleting a customer
        // with meeting history would silently wipe those verification
        // records too. Block it; there's no "deactivate" concept for
        // customers, so the admin just has to keep the record.
        if ($customer->meetings()->exists()) {
            return $this->error(
                'Nasabah ini memiliki riwayat meeting dan tidak dapat dihapus.',
                'CUSTOMER_HAS_MEETINGS'
            );
        }

        $customer->delete();

        return $this->success(null, 'Nasabah berhasil dihapus.');
    }
}
