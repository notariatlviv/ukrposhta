# Відправки Укрпошти за сьогодні

Статичний сайт на HTML + CSS + JavaScript, який підключається до API Укрпошти (eCom API) та виводить список відправок за поточну дату у вигляді таблиці. Працює безпосередньо на **GitHub Pages** без серверної частини.

## Можливості

- 📦 Список відправок за сьогодні в зручній таблиці
- 🔍 Живий пошук по таблиці
- ↕️ Сортування за будь-яким стовпцем
- 📱 Адаптивний дизайн (Bootstrap 5)
- 🇺🇦 Інтерфейс українською мовою
- 🔄 Кнопка «Оновити» для повторного завантаження
- ⚠️ Відображення помилок при недоступності API

## Налаштування та запуск

### 1. Клонуйте або завантажте репозиторій

```bash
git clone https://github.com/notariatlviv/ukrposhta.git
cd ukrposhta
```

### 2. Створіть файл конфігурації

```bash
cp js/config.js.example js/config.js
```

### 3. Відредагуйте `js/config.js` та вставте свої ключі API

```javascript
const CONFIG = {
    BEARER_ECOM:        'ваш_bearer_token_ecom',
    BEARER_STATUS:      'ваш_bearer_token_status',
    COUNTERPARTY_TOKEN: 'ваш_counterparty_token',
    COUNTERPARTY_UUID:  'ваш_counterparty_uuid',
    SENDER_POSTCODE:    'ваш_поштовий_індекс',
    ENV:                'production'
};
```

> ⚠️ **Ніколи не додавайте файл `js/config.js` до Git-репозиторію!** Він вже внесений до `.gitignore`.

### 4. Відкрийте сайт

Просто відкрийте `index.html` у браузері, або увімкніть GitHub Pages (дивіться нижче).

## Увімкнення GitHub Pages

1. Перейдіть у **Settings** → **Pages** вашого репозиторію
2. **Source:** Deploy from a branch
3. **Branch:** `main`, папка: `/ (root)`
4. Натисніть **Save**

Через кілька хвилин сайт буде доступний за адресою:
```
https://<ваш-username>.github.io/ukrposhta/
```

> ⚠️ **Важливо:** Файл `js/config.js` з реальними ключами НЕ потрапляє в репозиторій (він у `.gitignore`).
> Щоб сайт на GitHub Pages працював з вашими ключами — вам потрібно або:
> - Тимчасово додати `js/config.js` в коміт (не рекомендовано для публічних репозиторіїв), або
> - Налаштувати GitHub Actions для автоматичного розгортання з секретами.

## Обробка CORS

API Укрпошти може блокувати прямі запити з браузера (CORS-обмеження). Якщо ви бачите помилку CORS:

1. **Для тестування:** Встановіть розширення браузера *CORS Unblock* (Chrome/Firefox)
2. **Для production:** Налаштуйте серверний проксі (Cloudflare Worker, Netlify Function тощо)
3. **Серверний проксі:** Зробіть запит до API з вашого сервера, а не з браузера

## Структура проекту

```
ukrposhta/
├── index.html              # Головна сторінка з таблицею
├── css/
│   └── style.css           # Додаткові стилі
├── js/
│   ├── app.js              # Логіка роботи з API Укрпошти
│   ├── config.js           # Ваша конфігурація (НЕ в репозиторії!)
│   └── config.js.example   # Шаблон конфігурації
├── .gitignore
└── README.md
```

## API Укрпошти

- **Base URL:** `https://www.ukrposhta.ua/ecom/0.0.1`
- **Документація:** [eCom API Swagger](https://www.ukrposhta.ua/ecom/swagger-ui.html)

Для отримання ключів API зверніться до особистого кабінету Укрпошти.

## Ключі API

| Параметр | Опис |
|----------|------|
| `BEARER_ECOM` | Bearer-токен для eCom API (PRODUCTION) |
| `BEARER_STATUS` | Bearer-токен для Status Tracking API |
| `COUNTERPARTY_TOKEN` | Токен контрагента |
| `COUNTERPARTY_UUID` | UUID контрагента (PRODUCTION) |
| `SENDER_POSTCODE` | Поштовий індекс відправника |
| `ENV` | Середовище: `production` або `sandbox` |
