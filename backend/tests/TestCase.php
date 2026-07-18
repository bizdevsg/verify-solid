<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Simulate requests coming from the SPA so Sanctum treats them as
        // stateful (see config/sanctum.php `stateful` domains).
        $this->withHeader('Referer', config('app.frontend_url'));
    }
}
