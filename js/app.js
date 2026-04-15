/**
 * app.js — Логіка роботи з API Укрпошти
 *
 * Отримує відправки за сьогоднішню дату та відображає їх у таблиці.
 * Використовує fetch API та конфігурацію з js/config.js.
 */

// ─── Константи ─────────────────────────────────────────────────────────

/** Базова URL-адреса API */
const API_BASE_URL = 'https://www.ukrposhta.ua/ecom/0.0.1';

/** 
 * CORS-проксі для обходу блокування браузерних запитів.
 * Укрпошта API не підтримує CORS, тому потрібен проксі.
 * Список резервних проксі на випадок недоступності основного.
 */
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
];

let currentProxyIndex = 0;

// ─── DOM-елементи ──────────────────────────────────────────────────────

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

// ─── Стан сортування ─────────────────────────────────────────────────────

let sortState = {}; // { colIndex: true|false } — true = за зростанням

// ─── Утиліти ──────────────────────────────────────────────────────────

/**
 * Форматує дату в українському форматі (ДД.ММ.РРРР)
 */
function formatDateUa(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

/**
 * Форматує дату у формат YYYY-MM-DD для API
 */
function formatDateIso(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
}

/**
 * Форматує ПІБ отримувача
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
 */
function formatDeliveryAddress(shipment) {
    const parts = [];

    if (shipment.recipientCityName) {
        parts.push(shipment.recipientCityName);
    } else if (shipment.recipientPostcodeCity) {
        parts.push(shipment.recipientPostcodeCity);
    }

    if (shipment.recipientStreetName) {
        let street = shipment.recipientStreetName;
        if (shipment.recipientHouseNumber) street += ', ' + shipment.recipientHouseNumber;
        if (shipment.recipientFlatNumber)  street += '/' + shipment.recipientFlatNumber;
        parts.push(street);
    }

    if (shipment.recipientPostcode) {
        parts.push(shipment.recipientPostcode);
    }

    return parts.join(', ') || '—';
}

/**
 * Форматує вагу
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
 * Форматує оголошену вартість
 */
function formatDeclaredPrice(shipment) {
    const price = shipment.declaredPrice ?? shipment.postPay ?? null;
    if (!price) return '—';
    return (price / 100).toFixed(2).replace('.', ',') + '\u00A0грн';
}

/**
 * Форматує дату створення відправки
 */
function formatCreatedDate(shipment) {
    const raw = shipment.createTime ?? shipment.creationDate ?? shipment.dateCreated ?? null;
    if (!raw) return '—';

    let date;
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
 */
function formatStatus(shipment) {
    return shipment.lastStatusName ?? shipment.statusName ?? shipment.status ?? '—';
}

/**
 * Екранує HTML-символи для безпечного виводу
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── API-запити ─────────────────────────────────────────────────────────

/**
 * Спроба запиту через CORS-проксі.
 * Якщо один проксі не працює — пробує наступний.
 */
async function fetchWithCorsProxy(url, headers) {
    let lastError = null;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
        const proxy = CORS_PROXIES[proxyIndex];
        const proxyUrl = proxy + encodeURIComponent(url);

        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    ...headers,
                    'x-requested-with': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                currentProxyIndex = proxyIndex; // запам'ятовуємо працюючий проксі
                return response;
            }

            lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
            lastError = err;
        }
    }

    // Якщо жоден проксі не спрацював — пробуємо прямий запит
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        return response;
    } catch (directError) {
        throw new Error(
            'Не вдалося підключитися до API Укрпошти. ' +
            'Всі CORS-проксі недоступні, прямий запит також заблоковано. ' +
            'Спробуйте пізніше або зверніться до підтримки. ' +
            'Остання помилка: ' + (lastError ? lastError.message : directError.message)
        );
    }
}

/**
 * Отримує відправки за вказану дату з eCom API Укрпошти.
 */
async function fetchShipments(date, page = 0, size = 100) {
    // Перевірка наявності конфігурації
    if (typeof CONFIG === 'undefined') {
        throw new Error(
            'Файл js/config.js не знайдено. ' +
            'Скопіюйте js/config.js.example як js/config.js та заповніть ключі API.'
        );
    }

    const dateFrom = `${date}T00:00:00`;
    const dateTo   = `${date}T23:59:59`;

    const params = new URLSearchParams({
        counterpartyUuid: CONFIG.COUNTERPARTY_UUID,
        dateFrom,
        dateTo,
        page,
        size
    });

    const url = `${API_BASE_URL}/shipments?${params}`;

    const headers = {
        'Authorization':      `Bearer ${CONFIG.BEARER_ECOM}`,
        'counterparty-token': CONFIG.COUNTERPARTY_TOKEN,
        'Accept':             'application/json'
    };

    let response;
    try {
        response = await fetchWithCorsProxy(url, headers);
    } catch (networkError) {
        throw new Error(networkError.message);
    }

    if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errMsg += ': ' + (errData.message || errData.error || JSON.stringify(errData));
        } catch (_) {
            // Не вдалося розпарсити відповідь
        }
        throw new Error('Помилка API: ' + errMsg);
    }

    const data = await response.json();

    if (data && Array.isArray(data.content)) {
        return data.content;
    }
    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

// ─── Рендеринг ────────────────────────────────────────────────────────

/**
 * Відображає рядок таблиці для однієї відправки
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
 */
function setLoading(show) {
    spinnerEl.classList.toggle('d-none', !show);
}

/**
 * Показує блок помилки
 */
function showError(message) {
    errorMessageEl.textContent = message;
    errorEl.classList.remove('d-none');
}

/** Приховує всі стани */
function resetState() {
    errorEl.classList.add('d-none');
    emptyEl.classList.add('d-none');
    tableWrapEl.classList.add('d-none');
    if (totalBadgeEl) totalBadgeEl.classList.add('d-none');
}

// ─── Сортування ───────────────────────────────────────────────────────

/**
 * Сортує таблицю за вибраним стовпцем
 */
function sortTable(colIndex) {
    const table = document.getElementById('shipmentsTable');
    const tbody = table.querySelector('tbody');
    const rows  = Array.from(tbody.querySelectorAll('tr'));

    const asc = sortState[colIndex] !== true;
    sortState  = {};
    sortState[colIndex] = asc;

    rows.sort((a, b) => {
        const aText = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
        const bText = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';

        const aNum = parseFloat(aText.replace(/[^ .]/g, ''));
        const bNum = parseFloat(bText.replace(/[^ .]/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return asc ? aNum - bNum : bNum - aNum;
        }

        return asc
            ? aText.localeCompare(bText, 'uk')
            : bText.localeCompare(aText, 'uk');
    });

    table.querySelectorAll('thead th .sort-icon').forEach((icon, idx) => {
        if (idx === colIndex) {
            icon.className = 'bi sort-icon ' + (asc ? 'bi-sort-down text-white' : 'bi-sort-up text-white');
        } else {
            icon.className = 'bi bi-arrow-down-up sort-icon';
        }
    });

    rows.forEach(row => tbody.appendChild(row));

    tbody.querySelectorAll('tr').forEach((row, i) => {
        if (row.cells[0]) row.cells[0].textContent = i + 1;
    });
}

window.sortTable = sortTable;

// ─── Пошук ─────────────────────────────────────────────────────────────

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

// ─── Головна функція завантаження ────────────────────────────────────────

/**
 * Завантажує та відображає відправки за сьогодні
 */
async function loadShipments() {
    const today   = new Date();
    const dateIso = formatDateIso(today);
    const dateUa  = formatDateUa(today);

    if (dateDisplayEl)  dateDisplayEl.textContent  = dateUa;
    if (dateDisplay2El) dateDisplay2El.textContent = dateUa;
    if (emptyDateEl)    emptyDateEl.textContent    = dateUa;

    resetState();
    setLoading(true);

    if (refreshBtnEl) {
        refreshBtnEl.disabled = true;
        refreshBtnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Завантаження...';
    }

    try {
        const shipments = await fetchShipments(dateIso);

        if (shipments.length === 0) {
            emptyEl.classList.remove('d-none');
        } else {
            tbodyEl.innerHTML = shipments
                .map((s, i) => renderRow(s, i + 1))
                .join('');

            if (rowCountEl)   rowCountEl.textContent   = shipments.length;
            if (totalCountEl) totalCountEl.textContent = shipments.length;
            if (totalBadgeEl) totalBadgeEl.classList.remove('d-none');

            tableWrapEl.classList.remove('d-none');
            sortState = {};
        }
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);

        if (refreshBtnEl) {
            refreshBtnEl.disabled = false;
            refreshBtnEl.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Оновити';
        }

        if (updatedAtEl) {
            const now = new Date();
            const h   = String(now.getHours()).padStart(2, '0');
            const mi  = String(now.getMinutes()).padStart(2, '0');
            const s   = String(now.getSeconds()).padStart(2, '0');
            updatedAtEl.textContent = `${h}:${mi}:${s}`;
        }
    }
}

// ─── Ініціалізація ─────────────────────────────────────────────────────

if (searchInputEl) {
    searchInputEl.addEventListener('input', applySearch);
}

if (refreshBtnEl) {
    refreshBtnEl.addEventListener('click', loadShipments);
}

loadShipments();