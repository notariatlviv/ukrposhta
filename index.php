<?php

/**
 * index.php — Головна сторінка з таблицею відправок Укрпошти за сьогодні
 *
 * Підключається до eCom API Укрпошти та виводить список відправок
 * за поточну дату у вигляді адаптивної таблиці Bootstrap 5.
 */

// Завантаження конфігурації (.env)
require_once __DIR__ . '/config.php';

// Підключення класу API (якщо використовується без Composer)
if (!class_exists('App\\UkrposhtaApi')) {
    require_once __DIR__ . '/src/UkrposhtaApi.php';
}

use App\UkrposhtaApi;

// --- Ініціалізація ---
$today     = date('Y-m-d');
$todayUa   = date('d.m.Y');
$shipments = [];
$error     = null;

// --- Отримання відправок з API ---
try {
    $api = new UkrposhtaApi(
        env('UKRPOSHTA_BEARER_ECOM'),
        env('UKRPOSHTA_COUNTERPARTY_TOKEN'),
        env('UKRPOSHTA_COUNTERPARTY_UUID')
    );

    $shipments = $api->getShipmentsByDate($today);
} catch (\RuntimeException $e) {
    $error = $e->getMessage();
} catch (\Throwable $e) {
    $error = 'Непередбачена помилка: ' . $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Відправки Укрпошти за сьогодні</title>

    <!-- Bootstrap 5 CDN -->
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
        crossorigin="anonymous"
    >

    <!-- Bootstrap Icons -->
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
    >

    <style>
        body {
            background-color: #f8f9fa;
        }
        .navbar-brand img {
            height: 32px;
        }
        .table-container {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, .08);
            padding: 1.5rem;
        }
        .badge-status {
            font-size: .8rem;
            padding: .4em .7em;
        }
        thead th {
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
        }
        thead th:hover {
            background-color: #e9ecef;
        }
        thead th .sort-icon {
            font-size: .75rem;
            margin-left: .25rem;
            color: #adb5bd;
        }
        .barcode {
            font-family: monospace;
            font-size: .9rem;
            font-weight: 600;
            letter-spacing: .05em;
        }
        .count-badge {
            font-size: 1rem;
        }
        @media (max-width: 768px) {
            .table-responsive { font-size: .85rem; }
        }
    </style>
</head>
<body>

<!-- Навігаційна панель -->
<nav class="navbar navbar-expand-lg navbar-dark bg-danger shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="#">
            <i class="bi bi-box-seam me-2"></i>Укрпошта
        </a>
        <span class="navbar-text text-white-50">
            <i class="bi bi-calendar3 me-1"></i><?= htmlspecialchars($todayUa, ENT_QUOTES, 'UTF-8') ?>
        </span>
    </div>
</nav>

<!-- Основний контент -->
<div class="container my-4">

    <!-- Заголовок -->
    <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
            <h1 class="h3 mb-0 fw-bold">
                <i class="bi bi-truck me-2 text-danger"></i>Відправки Укрпошти за сьогодні
            </h1>
            <p class="text-muted mb-0 mt-1">
                <i class="bi bi-calendar-check me-1"></i><?= htmlspecialchars($todayUa, ENT_QUOTES, 'UTF-8') ?>
            </p>
        </div>
        <?php if (!$error && !empty($shipments)): ?>
        <span class="badge bg-danger count-badge">
            <i class="bi bi-box me-1"></i><?= count($shipments) ?> відправок
        </span>
        <?php endif; ?>
    </div>

    <!-- Блок помилки -->
    <?php if ($error !== null): ?>
    <div class="alert alert-danger d-flex align-items-start gap-2" role="alert">
        <i class="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0 mt-1"></i>
        <div>
            <strong>Помилка підключення до API:</strong><br>
            <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
        </div>
    </div>

    <!-- Порада для налаштування -->
    <div class="alert alert-warning" role="alert">
        <i class="bi bi-lightbulb me-2"></i>
        <strong>Підказка:</strong> Переконайтеся, що файл <code>.env</code> заповнено коректними ключами API
        та виконано <code>composer install</code>.
    </div>

    <?php elseif (empty($shipments)): ?>

    <!-- Порожній стан -->
    <div class="table-container text-center py-5">
        <i class="bi bi-inbox display-1 text-muted"></i>
        <h4 class="mt-3 text-muted">Відправок за сьогодні немає</h4>
        <p class="text-muted">Жодної відправки не знайдено за <?= htmlspecialchars($todayUa, ENT_QUOTES, 'UTF-8') ?></p>
    </div>

    <?php else: ?>

    <!-- Панель пошуку та фільтрації -->
    <div class="table-container">
        <div class="row g-2 mb-3">
            <div class="col-md-6">
                <div class="input-group">
                    <span class="input-group-text bg-white">
                        <i class="bi bi-search text-muted"></i>
                    </span>
                    <input
                        type="text"
                        id="searchInput"
                        class="form-control"
                        placeholder="Пошук за номером, отримувачем, адресою..."
                    >
                </div>
            </div>
            <div class="col-md-3 ms-auto">
                <button class="btn btn-outline-secondary w-100" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Оновити
                </button>
            </div>
        </div>

        <!-- Таблиця відправок -->
        <div class="table-responsive">
            <table class="table table-hover table-bordered align-middle mb-0" id="shipmentsTable">
                <thead class="table-dark">
                    <tr>
                        <th onclick="sortTable(0)" title="Сортувати">
                            # <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(1)" title="Сортувати">
                            <i class="bi bi-upc-scan me-1"></i>Номер відправки
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(2)" title="Сортувати">
                            <i class="bi bi-person me-1"></i>Отримувач
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(3)" title="Сортувати">
                            <i class="bi bi-geo-alt me-1"></i>Адреса доставки
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(4)" title="Сортувати">
                            <i class="bi bi-speedometer me-1"></i>Вага
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(5)" title="Сортувати">
                            <i class="bi bi-info-circle me-1"></i>Статус
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(6)" title="Сортувати">
                            <i class="bi bi-calendar me-1"></i>Дата створення
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                        <th onclick="sortTable(7)" title="Сортувати">
                            <i class="bi bi-currency-exchange me-1"></i>Оголошена вартість
                            <i class="bi bi-arrow-down-up sort-icon"></i>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($shipments as $index => $shipment): ?>
                    <tr>
                        <td class="text-muted"><?= $index + 1 ?></td>
                        <td>
                            <span class="barcode">
                                <?= htmlspecialchars(
                                    $shipment['barcode'] ?? $shipment['barCode'] ?? $shipment['uuid'] ?? '—',
                                    ENT_QUOTES,
                                    'UTF-8'
                                ) ?>
                            </span>
                        </td>
                        <td><?= htmlspecialchars(UkrposhtaApi::formatRecipientName($shipment), ENT_QUOTES, 'UTF-8') ?></td>
                        <td><?= htmlspecialchars(UkrposhtaApi::formatDeliveryAddress($shipment), ENT_QUOTES, 'UTF-8') ?></td>
                        <td class="text-nowrap"><?= htmlspecialchars(UkrposhtaApi::formatWeight($shipment), ENT_QUOTES, 'UTF-8') ?></td>
                        <td>
                            <?php $status = UkrposhtaApi::formatStatus($shipment); ?>
                            <span class="badge badge-status bg-secondary">
                                <?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?>
                            </span>
                        </td>
                        <td class="text-nowrap"><?= htmlspecialchars(UkrposhtaApi::formatCreatedDate($shipment), ENT_QUOTES, 'UTF-8') ?></td>
                        <td class="text-nowrap"><?= htmlspecialchars(UkrposhtaApi::formatDeclaredPrice($shipment), ENT_QUOTES, 'UTF-8') ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div><!-- /.table-responsive -->

        <!-- Підсумок -->
        <div class="mt-3 text-muted small">
            Всього знайдено: <strong id="rowCount"><?= count($shipments) ?></strong> відправок
        </div>
    </div><!-- /.table-container -->

    <?php endif; ?>

</div><!-- /.container -->

<!-- Нижній колонтитул -->
<footer class="text-center text-muted py-3 mt-auto border-top bg-white">
    <small>
        <i class="bi bi-clock me-1"></i>Оновлено: <?= date('d.m.Y H:i:s') ?>
        &nbsp;|&nbsp;
        <a href="https://www.ukrposhta.ua" target="_blank" rel="noopener" class="text-muted">
            ukrposhta.ua
        </a>
    </small>
</footer>

<!-- Bootstrap 5 JS -->
<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
    crossorigin="anonymous"
></script>

<script>
    /**
     * Живий пошук по таблиці
     */
    document.getElementById('searchInput').addEventListener('input', function () {
        const query = this.value.toLowerCase();
        const rows  = document.querySelectorAll('#shipmentsTable tbody tr');
        let visible = 0;

        rows.forEach(function (row) {
            const text = row.textContent.toLowerCase();
            const show = text.includes(query);
            row.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        document.getElementById('rowCount').textContent = visible;
    });

    /**
     * Сортування таблиці за стовпцем
     *
     * @param {number} colIndex Індекс стовпця (з 0)
     */
    let sortState = {};

    function sortTable(colIndex) {
        const table = document.getElementById('shipmentsTable');
        const tbody = table.querySelector('tbody');
        const rows  = Array.from(tbody.querySelectorAll('tr'));

        // Визначаємо напрямок сортування
        const asc = sortState[colIndex] !== true;
        sortState = {};
        sortState[colIndex] = asc;

        rows.sort(function (a, b) {
            const aText = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
            const bText = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';

            // Числове або текстове порівняння
            const aNum = parseFloat(aText.replace(/[^\d.]/g, ''));
            const bNum = parseFloat(bText.replace(/[^\d.]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return asc ? aNum - bNum : bNum - aNum;
            }

            return asc
                ? aText.localeCompare(bText, 'uk')
                : bText.localeCompare(aText, 'uk');
        });

        // Оновлюємо іконки сортування
        table.querySelectorAll('thead th .sort-icon').forEach(function (icon, idx) {
            if (idx === colIndex) {
                icon.className = 'bi sort-icon ' + (asc ? 'bi-sort-down text-white' : 'bi-sort-up text-white');
            } else {
                icon.className = 'bi bi-arrow-down-up sort-icon';
            }
        });

        // Рендеримо відсортовані рядки
        rows.forEach(function (row) { tbody.appendChild(row); });

        // Перенумеровуємо рядки після сортування
        tbody.querySelectorAll('tr').forEach(function (row, i) {
            if (row.cells[0]) row.cells[0].textContent = i + 1;
        });
    }
</script>

</body>
</html>
