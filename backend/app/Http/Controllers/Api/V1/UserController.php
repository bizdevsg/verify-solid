<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()->orderBy('name')->paginate($request->integer('per_page', 20));

        return $this->success([
            'items' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $this->authorize('create', User::class);

        $user = User::create([
            ...$request->validated(),
            'is_active' => true,
        ]);

        return $this->success(new UserResource($user), 'Akun staf berhasil dibuat.', 201);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $this->authorize('update', $user);

        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return $this->success(new UserResource($user), 'Akun staf berhasil diperbarui.');
    }

    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        // meetings.staff_id cascades on delete — hard-deleting a staff member
        // with meeting history would silently wipe those verification
        // records too. Block it and point the admin at deactivation instead,
        // which keeps the account out of use without touching history.
        if ($user->meetings()->exists()) {
            return $this->error(
                'Akun ini memiliki riwayat meeting dan tidak dapat dihapus. Nonaktifkan akun ini sebagai gantinya.',
                'USER_HAS_MEETINGS'
            );
        }

        $user->delete();

        return $this->success(null, 'Akun berhasil dihapus.');
    }
}
