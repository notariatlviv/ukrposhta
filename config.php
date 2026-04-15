<?php

/**
 * Завантаження конфігурації з .env файлу
 *
 * Підтримує два режими:
 *  1. Через бібліотеку vlucas/phpdotenv (якщо встановлено через Composer)
 *  2. Ручний парсинг .env файлу (якщо vendor/ відсутній)
 */

// Шлях до кореневої директорії проекту
$rootDir = __DIR__;

// --- Спроба завантажити автозавантажувач Composer ---
$autoloadPath = $rootDir . '/vendor/autoload.php';

if (file_exists($autoloadPath)) {
    require_once $autoloadPath;

    // Завантажуємо .env через phpdotenv
    $dotenv = Dotenv\Dotenv::createImmutable($rootDir);
    $dotenv->load();
    $dotenv->required([
        'UKRPOSHTA_BEARER_ECOM',
        'UKRPOSHTA_COUNTERPARTY_TOKEN',
        'UKRPOSHTA_COUNTERPARTY_UUID',
    ])->notEmpty();
} else {
    // --- Ручний парсинг .env якщо vendor/ відсутній ---
    $envFile = $rootDir . '/.env';

    if (!file_exists($envFile)) {
        // Показуємо зрозуміле повідомлення про помилку
        http_response_code(500);
        echo '<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><title>Помилка конфігурації</title>'
            . '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">'
            . '</head><body class="bg-light"><div class="container mt-5">'
            . '<div class="alert alert-danger">'
            . '<h4>⚠️ Файл конфігурації не знайдено</h4>'
            . '<p>Будь ласка, скопіюйте <code>.env.example</code> у <code>.env</code> та заповніть свої ключі API.</p>'
            . '<p>Також виконайте: <code>composer install</code></p>'
            . '</div></div></body></html>';
        exit;
    }

    // Парсимо .env вручну
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Пропускаємо коментарі
        if (str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!empty($key)) {
            $_ENV[$key]    = $value;
            $_SERVER[$key] = $value;
            putenv("$key=$value");
        }
    }
}

/**
 * Повертає значення змінної середовища
 *
 * @param string $key     Назва змінної
 * @param string $default Значення за замовчуванням
 *
 * @return string Значення змінної
 */
function env(string $key, string $default = ''): string
{
    return $_ENV[$key] ?? getenv($key) ?: $default;
}
