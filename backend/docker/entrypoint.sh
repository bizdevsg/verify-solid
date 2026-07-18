#!/bin/sh
set -e

echo "Waiting for database ($DB_HOST:$DB_PORT)..."
until php -r "new PDO('mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" 2>/dev/null; do
    sleep 2
done
echo "Database is up."

php artisan migrate --force

php artisan config:cache
php artisan route:cache

chown -R www-data:www-data storage bootstrap/cache

exec php-fpm
