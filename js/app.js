/**
 * app.js — Логіка роботи з API Укрпошти
 *
 * Отримує відправки за сьогоднішню дату та відображає їх у таблиці.
 * Використовує fetch API та конфігурацію з js/config.js.
 */

// ─── Константи ────────────────────────────────────────────────────────────────

/** Базова URL-адреса API (production та sandbox використовують однаковий хост; середовище визначається токенами) */
const API_BASE_URL = 'https://www.ukrposhta.ua/ecom/0.0.1';

// ─── DOM-елементи ──────────────────────────────────────────────────────────────

const spinnerEl      = document.getElementById('spinner');
const errorEl        = document.getElementById('errorBlock');
const errorMessageEl = document.getElementById('errorMessage');
const emptyEl        = document.getElementById('emptyBlock');
const tableWrapEl    = document.getElementById('tableWrapper');
const tbodyEl        = document.getElementById('shipmentsBody');
const rowCountEl     = document.getElementById('rowCount');
const totalCountEl   = document.getElementById('totalCount');
const totalBadgeEl   = document.getElementById('totalBadge');
const searchInputEl  = document.getElementById('searchInput');
const refreshBtnEl   = document.getElementById('refreshBtn');
const dateDisplayEl  = document.getElementById('dateDisplay');
const dateDisplay2El = document.getElementById('dateDisplay2');
const emptyDateEl    = document.getElementById('emptyDate');
const updatedAtEl    = document.getElementById('updatedAt');

// ─── Стан сортування ───────────────────────────────────────────────────────────

let sortState = {}; // { colIndex: true|false } — true = за зростанням

// ─── Утиліти ───────────────────────────────────────────────────────────────────

/**
 * Форматує дату в українському форматі (ДД.ММ.РРРР)
 * @param {Date} date
 * @returns {string}
 */
function formatDateUa(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

/**
 * Форматує дату у формат YYYY-MM-DD для API
 * @param {Date} date
 * @returns {string}
 */
function formatDateIso(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
}

/**
 * Форматує ПІБ отримувача
 * @param {Object} shipment
 * @returns {string}
 */
function formatRecipientName(shipment) {
    const parts = [
        shipment.recipientLastName   || '',
        shipment.recipientFirstName  || '',
        shipment.recipientMiddleName || ''
    ].filter(Boolean);
    return parts.join(' ') || '—';
}

/**
 * Форматує адресу доставки
 * @param {Object} shipment
 * @returns {string}
 */
function formatDeliveryAddress(shipment) {
    const parts = [];

    // Населений пункт
    if (shipment.recipientCityName) {
        parts.push(shipment.recipientCityName);
    } else if (shipment.recipientPostcodeCity) {
        parts.push(shipment.recipientPostcodeCity);
    }

    // Вулиця з номером будинку та квартири
    if (shipment.recipientStreetName) {
        let street = shipment.recipientStreetName;
        if (shipment.recipientHouseNumber) street += ', ' + shipment.recipientHouseNumber;
        if (shipment.recipientFlatNumber)  street += '/' + shipment.recipientFlatNumber;
        parts.push(street);
    }

    // Поштовий індекс
    if (shipment.recipientPostcode) {
        parts.push(shipment.recipientPostcode);
    }

    return parts.join(', ') || '—';
}

/**
 * Форматує вагу (зберігається в грамах)
 * @param {Object} shipment
 * @returns {string}
 */
function formatWeight(shipment) {
    const grams = shipment.weight;
    if (grams == null) return '—';
    if (grams >= 1000) {
        return (grams / 1000).toFixed(3).replace('.', ',') + '\u00A0кг';
    }
    return grams + '\u00A0г';
}

/**
 * Форматує оголошену вартість (зберігається в копійках)
 * @param {Object} shipment
 * @returns {string}
 */
function formatDeclaredPrice(shipment) {
    const price = shipment.declaredPrice ?? shipment.postPay ?? null;
    if (!price) return '—';
    return (price / 100).toFixed(2).replace('.', ',') + '\u00A0грн';
}

/**
 * Форматує дату створення відправки
 * @param {Object} shipment
 * @returns {string}
 */
function formatCreatedDate(shipment) {
    const raw = shipment.createTime ?? shipment.creationDate ?? shipment.dateCreated ?? null;
    if (!raw) return '—';

    let date;

    // UNIX timestamp (значення < 1e10 — у секундах, >= 1e10 — у мілісекундах)
    if (typeof raw === 'number') {
        date = new Date(raw < 1e10 ? raw * 1000 : raw);
    } else {
        date = new Date(raw);
    }

    if (isNaN(date.getTime())) return String(raw);

    const d  = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const y  = date.getFullYear();
    const h  = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${d}.${mo}.${y} ${h}:${mi}`;
}

/**
 * Повертає назву статусу відправки
 * @param {Object} shipment
 * @returns {string}
 */
function formatStatus(shipment) {
    return shipment.lastStatusName ?? shipment.statusName ?? shipment.status ?? '—';
}

/**
 * Екранує HTML-символи для безпечного виводу
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── API-запити ────────────────────────────────────────────────────────────────

/**
 * Отримує відправки за вказану дату з eCom API Укрпошти.
 *
 * CORS-примітка: Укрпошта API може блокувати запити безпосередньо з браузера
 * (заголовок Access-Control-Allow-Origin відсутній або обмежений).
 * Якщо виникає CORS-помилка, можливі рішення:
 *   1. Використати серверний проксі (Cloudflare Worker, Netlify Function тощо).
 *   2. Використати публічний CORS-проксі для розробки (не рекомендовано для production).
 *
 * @param {string} date — дата у форматі YYYY-MM-DD
 * @param {number} [page=0] — номер сторінки
 * @param {number} [size=100] — кількість записів
 * @returns {Promise<Array>}
 */
async function fetchShipments(date, page = 0, size = 100) {
    // Перевірка наявності конфігурації
    if (typeof CONFIG === 'undefined') {
        throw new Error(
            'Файл js/config.js не знайдено. ' +
            'Скопіюйте js/config.js.example як js/config.js та заповніть ключі API.'
        );
    }

    const baseUrl  = API_BASE_URL;
    const dateFrom = `${date}T00:00:00`;
    const dateTo   = `${date}T23:59:59`;

    const params = new URLSearchParams({
        counterpartyUuid: CONFIG.COUNTERPARTY_UUID,
        dateFrom,
        dateTo,
        page,
        size
    });

    const url = `${baseUrl}/shipments?${params}`;

    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization':      `Bearer ${CONFIG.BEARER_ECOM}`,
                'counterparty-token': CONFIG.COUNTERPARTY_TOKEN,
                'Accept':             'application/json'
            }
        });
    } catch (networkError) {
        // Мережева помилка (може включати CORS-блокування, відсутність з'єднання тощо).
        // Примітка: JavaScript не дозволяє надійно відрізнити CORS-помилку від інших мережевих помилок —
        // обидва типи проявляються як TypeError з мінімальними деталями.
        throw new Error(
            'Помилка мережевого доступу до API Укрпошти. ' +
            'Можливі причини: відсутнє з\'єднання з інтернетом, ' +
            'CORS-блокування (API не дозволяє прямі запити з браузера), ' +
            'або API тимчасово недоступне. ' +
            'Для вирішення CORS: налаштуйте серверний проксі або використайте CORS Anywhere для тестування. ' +
            'Деталі: ' + networkError.message
        );
    }

    if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errMsg += ': ' + (errData.message || errData.error || JSON.stringify(errData));
        } catch (_) {
            // Не вдалося розпарсити відповідь — залишаємо HTTP-код
        }
        throw new Error('Помилка API: ' + errMsg);
    }

    const data = await response.json();

    // Відповідь може бути { content: [...] } або масивом
    if (data && Array.isArray(data.content)) {
        return data.content;
    }
    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

// ─── Рендеринг ─────────────────────────────────────────────────────────────────

/**
 * Відображає рядок таблиці для однієї відправки
 * @param {Object} shipment
 * @param {number} index — порядковий номер (з 1)
 * @returns {string} HTML-рядок
 */
function renderRow(shipment, index) {
    const barcode = escapeHtml(
        shipment.barcode ?? shipment.barCode ?? shipment.uuid ?? '—'
    );
    const recipient = escapeHtml(formatRecipientName(shipment));
    const address   = escapeHtml(formatDeliveryAddress(shipment));
    const weight    = escapeHtml(formatWeight(shipment));
    const status    = escapeHtml(formatStatus(shipment));
    const created   = escapeHtml(formatCreatedDate(shipment));
    const price     = escapeHtml(formatDeclaredPrice(shipment));

    return `
        <tr>
            <td class="text-muted">${index}</td>
            <td><span class="barcode">${barcode}</span></td>
            <td>${recipient}</td>
            <td>${address}</td>
            <td class="text-nowrap">${weight}</td>
            <td><span class="badge badge-status bg-secondary">${status}</span></td>
            <td class="text-nowrap">${created}</td>
            <td class="text-nowrap">${price}</td>
        </tr>
    `;
}

/**
 * Показує або приховує спінер завантаження
 * @param {boolean} show
 */
function setLoading(show) {
    spinnerEl.classList.toggle('d-none', !show);
}

/**
 * Показує блок помилки
 * @param {string} message
 */
function showError(message) {
    errorMessageEl.textContent = message;
    errorEl.classList.remove('d-none');
}

/** Приховує всі стани (помилка, порожній стан, таблиця) */
function resetState() {
    errorEl.classList.add('d-none');
    emptyEl.classList.add('d-none');
    tableWrapEl.classList.add('d-none');
    if (totalBadgeEl) totalBadgeEl.classList.add('d-none');
}

// ─── Сортування ────────────────────────────────────────────────────────────────

/**
 * Сортує таблицю за вибраним стовпцем
 * @param {number} colIndex — індекс стовпця (з 0)
 */
function sortTable(colIndex) {
    const table = document.getElementById('shipmentsTable');
    const tbody = table.querySelector('tbody');
    const rows  = Array.from(tbody.querySelectorAll('tr'));

    // Визначаємо напрямок сортування (toggle)
    const asc = sortState[colIndex] !== true;
    sortState  = {};
    sortState[colIndex] = asc;

    rows.sort((a, b) => {
        const aText = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
        const bText = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';

        // Числове порівняння
        const aNum = parseFloat(aText.replace(/[^\d.]/g, ''));
        const bNum = parseFloat(bText.replace(/[^\d.]/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return asc ? aNum - bNum : bNum - aNum;
        }

        return asc
            ? aText.localeCompare(bText, 'uk')
            : bText.localeCompare(aText, 'uk');
    });

    // Оновлюємо іконки сортування в заголовку
    table.querySelectorAll('thead th .sort-icon').forEach((icon, idx) => {
        if (idx === colIndex) {
            icon.className = 'bi sort-icon ' + (asc ? 'bi-sort-down text-white' : 'bi-sort-up text-white');
        } else {
            icon.className = 'bi bi-arrow-down-up sort-icon';
        }
    });

    // Рендеримо відсортовані рядки
    rows.forEach(row => tbody.appendChild(row));

    // Перенумеровуємо після сортування
    tbody.querySelectorAll('tr').forEach((row, i) => {
        if (row.cells[0]) row.cells[0].textContent = i + 1;
    });
}

// Робимо функцію sortTable глобальною (викликається з onclick в HTML)
window.sortTable = sortTable;

// ─── Пошук ─────────────────────────────────────────────────────────────────────

/** Фільтрує рядки таблиці за текстом пошуку */
function applySearch() {
    const query   = searchInputEl.value.toLowerCase();
    const rows    = document.querySelectorAll('#shipmentsTable tbody tr');
    let   visible = 0;

    rows.forEach(row => {
        const match = row.textContent.toLowerCase().includes(query);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
    });

    if (rowCountEl) rowCountEl.textContent = visible;
}

// ─── Головна функція завантаження ──────────────────────────────────────────────

/**
 * Завантажує та відображає відправки за сьогодні
 */
async function loadShipments() {
    const today   = new Date();
    const dateIso = formatDateIso(today);
    const dateUa  = formatDateUa(today);

    // Оновлюємо дату в усіх елементах заголовку одразу
    if (dateDisplayEl)  dateDisplayEl.textContent  = dateUa;
    if (dateDisplay2El) dateDisplay2El.textContent = dateUa;
    if (emptyDateEl)    emptyDateEl.textContent    = dateUa;

    resetState();
    setLoading(true);

    // Блокуємо кнопку оновлення
    if (refreshBtnEl) {
        refreshBtnEl.disabled = true;
        refreshBtnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Завантаження...';
    }

    try {
        const shipments = await fetchShipments(dateIso);

        if (shipments.length === 0) {
            // Немає відправок за сьогодні
            emptyEl.classList.remove('d-none');
        } else {
            // Рендеримо рядки таблиці
            tbodyEl.innerHTML = shipments
                .map((s, i) => renderRow(s, i + 1))
                .join('');

            // Оновлюємо лічильники та показуємо бейдж
            if (rowCountEl)   rowCountEl.textContent   = shipments.length;
            if (totalCountEl) totalCountEl.textContent = shipments.length;
            if (totalBadgeEl) totalBadgeEl.classList.remove('d-none');

            tableWrapEl.classList.remove('d-none');
            sortState = {}; // скидаємо стан сортування
        }
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);

        // Відновлюємо кнопку оновлення
        if (refreshBtnEl) {
            refreshBtnEl.disabled = false;
            refreshBtnEl.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Оновити';
        }

        // Оновлюємо час останнього оновлення
        if (updatedAtEl) {
            const now = new Date();
            const h   = String(now.getHours()).padStart(2, '0');
            const mi  = String(now.getMinutes()).padStart(2, '0');
            const s   = String(now.getSeconds()).padStart(2, '0');
            updatedAtEl.textContent = `${h}:${mi}:${s}`;
        }
    }
}

// ─── Ініціалізація ─────────────────────────────────────────────────────────────

// Підписка на подію пошуку
if (searchInputEl) {
    searchInputEl.addEventListener('input', applySearch);
}

// Кнопка оновлення
if (refreshBtnEl) {
    refreshBtnEl.addEventListener('click', loadShipments);
}

// Завантажуємо дані при старті сторінки
loadShipments();
