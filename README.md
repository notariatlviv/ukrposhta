# Відправки Укрпошти за сьогодні

PHP-сайт, який підключається до API Укрпошти (eCom API) та виводить список відправок за поточну дату у вигляді таблиці.

## Можливості

- 📦 Список відправок за сьогодні в зручній таблиці
- 🔍 Живий пошук по таблиці
- ↕️ Сортування за будь-яким стовпцем
- 📱 Адаптивний дизайн (Bootstrap 5)
- 🇺🇦 Інтерфейс українською мовою
- ⚠️ Відображення помилок при недоступності API

## Вимоги

- PHP >= 7.4
- Composer
- Доступ до eCom API Укрпошти

## Встановлення

### 1. Клонуйте або завантажте репозиторій

```bash
git clone https://github.com/notariatlviv/ukrposhta.git
cd ukrposhta
```

### 2. Встановіть залежності через Composer

```bash
composer install
```

### 3. Створіть файл конфігурації

```bash
cp .env.example .env
```

### 4. Відредагуйте `.env` та вставте свої ключі API

```env
UKRPOSHTA_BEARER_ECOM=ваш_bearer_token_ecom
UKRPOSHTA_BEARER_STATUS=ваш_bearer_token_status
UKRPOSHTA_COUNTERPARTY_TOKEN=ваш_counterparty_token
UKRPOSHTA_COUNTERPARTY_UUID=ваш_counterparty_uuid
UKRPOSHTA_SENDER_POSTCODE=ваш_поштовий_індекс
UKRPOSHTA_ENV=production
```

> ⚠️ **Ніколи не додавайте файл `.env` до Git-репозиторію!** Він вже внесений до `.gitignore`.

### 5. Запустіть вбудований PHP-сервер (для розробки)

```bash
php -S localhost:8080
```

Відкрийте браузер: [http://localhost:8080](http://localhost:8080)

### Або розмістіть на веб-сервері

Скопіюйте файли на хостинг (Apache/Nginx) та відкрийте `index.php`.

## Структура проекту

```
ukrposhta/
├── index.php           # Головна сторінка з таблицею
├── config.php          # Завантаження конфігурації з .env
├── src/
│   └── UkrposhtaApi.php  # Клас для роботи з API Укрпошти
├── composer.json       # Залежності
├── .env.example        # Шаблон конфігурації
├── .env                # Ваша конфігурація (НЕ в репозиторії!)
├── .gitignore
└── README.md
```

## API Укрпошти

- **Base URL:** `https://www.ukrposhta.ua/ecom/0.0.1`
- **Документація:** [eCom API Swagger](https://www.ukrposhta.ua/ecom/swagger-ui.html)

Для отримання ключів API зверніться до особистого кабінету Укрпошти.

## Ключі API (де взяти)

| Змінна | Опис |
|--------|------|
| `UKRPOSHTA_BEARER_ECOM` | Bearer-токен для eCom API (PRODUCTION) |
| `UKRPOSHTA_BEARER_STATUS` | Bearer-токен для Status Tracking API |
| `UKRPOSHTA_COUNTERPARTY_TOKEN` | Токен контрагента |
| `UKRPOSHTA_COUNTERPARTY_UUID` | UUID контрагента (PRODUCTION) |
| `UKRPOSHTA_SENDER_POSTCODE` | Поштовий індекс відправника |
| `UKRPOSHTA_ENV` | Середовище: `production` або `sandbox` |
