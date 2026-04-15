<?php

/**
 * Клас для роботи з API Укрпошти (eCom API)
 *
 * Документація: https://www.ukrposhta.ua/ecom/swagger-ui.html
 */

namespace App;

class UkrposhtaApi
{
    /** @var string Базова URL-адреса API */
    private string $baseUrl = 'https://www.ukrposhta.ua/ecom/0.0.1';

    /** @var string Bearer-токен для авторизації (eCom) */
    private string $bearerToken;

    /** @var string Токен контрагента */
    private string $counterpartyToken;

    /** @var string UUID контрагента */
    private string $counterpartyUuid;

    /**
     * Конструктор класу
     *
     * @param string $bearerToken       Bearer-токен eCom API
     * @param string $counterpartyToken Токен контрагента
     * @param string $counterpartyUuid  UUID контрагента
     */
    public function __construct(string $bearerToken, string $counterpartyToken, string $counterpartyUuid)
    {
        $this->bearerToken       = $bearerToken;
        $this->counterpartyToken = $counterpartyToken;
        $this->counterpartyUuid  = $counterpartyUuid;
    }

    /**
     * Виконує HTTP-запит до API
     *
     * @param string $method   HTTP-метод (GET, POST тощо)
     * @param string $endpoint Шлях до ресурсу
     * @param array  $params   GET-параметри запиту
     *
     * @return array Розпарсена відповідь у вигляді масиву
     * @throws \RuntimeException У разі помилки запиту або відповіді
     */
    private function request(string $method, string $endpoint, array $params = []): array
    {
        $url = $this->baseUrl . $endpoint;

        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->bearerToken,
                'counterparty-token: ' . $this->counterpartyToken,
                'Accept: application/json',
                'Content-Type: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        // Перевірка помилок cURL
        if ($response === false) {
            throw new \RuntimeException('Помилка cURL: ' . $error);
        }

        // Розпарсити JSON-відповідь
        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Невірний формат відповіді від API: ' . json_last_error_msg());
        }

        // Перевірити HTTP-код відповіді
        if ($httpCode < 200 || $httpCode >= 300) {
            $message = $data['message'] ?? $data['error'] ?? 'Невідома помилка API';
            throw new \RuntimeException('Помилка API (HTTP ' . $httpCode . '): ' . $message);
        }

        return $data;
    }

    /**
     * Отримує список відправок за вказану дату
     *
     * @param string $date Дата у форматі YYYY-MM-DD (за замовчуванням — сьогодні)
     * @param int    $page Номер сторінки (нумерація з 0)
     * @param int    $size Кількість записів на сторінці
     *
     * @return array Масив відправок
     * @throws \RuntimeException У разі помилки запиту
     */
    public function getShipmentsByDate(string $date = '', int $page = 0, int $size = 100): array
    {
        if ($date === '') {
            $date = date('Y-m-d');
        }

        // Формуємо часові межі для фільтрації за датою
        $dateFrom = $date . 'T00:00:00';
        $dateTo   = $date . 'T23:59:59';

        $params = [
            'counterpartyUuid' => $this->counterpartyUuid,
            'dateFrom'         => $dateFrom,
            'dateTo'           => $dateTo,
            'page'             => $page,
            'size'             => $size,
        ];

        $response = $this->request('GET', '/shipments', $params);

        // Витягуємо масив відправок з відповіді
        if (isset($response['content']) && is_array($response['content'])) {
            return $response['content'];
        }

        // Якщо відповідь сама є масивом відправок
        if (isset($response[0]) || empty($response)) {
            return $response;
        }

        return [];
    }

    /**
     * Форматує адресу доставки у читабельний рядок
     *
     * @param array $shipment Дані відправки
     *
     * @return string Відформатована адреса
     */
    public static function formatDeliveryAddress(array $shipment): string
    {
        $parts = [];

        // Населений пункт
        if (!empty($shipment['recipientCityName'])) {
            $parts[] = $shipment['recipientCityName'];
        } elseif (!empty($shipment['recipientPostcodeCity'])) {
            $parts[] = $shipment['recipientPostcodeCity'];
        }

        // Вулиця
        if (!empty($shipment['recipientStreetName'])) {
            $street = $shipment['recipientStreetName'];
            if (!empty($shipment['recipientHouseNumber'])) {
                $street .= ', ' . $shipment['recipientHouseNumber'];
            }
            if (!empty($shipment['recipientFlatNumber'])) {
                $street .= '/' . $shipment['recipientFlatNumber'];
            }
            $parts[] = $street;
        }

        // Поштовий індекс
        if (!empty($shipment['recipientPostcode'])) {
            $parts[] = $shipment['recipientPostcode'];
        }

        return implode(', ', $parts) ?: '—';
    }

    /**
     * Форматує ПІБ отримувача
     *
     * @param array $shipment Дані відправки
     *
     * @return string ПІБ отримувача
     */
    public static function formatRecipientName(array $shipment): string
    {
        $parts = array_filter([
            $shipment['recipientLastName']   ?? '',
            $shipment['recipientFirstName']  ?? '',
            $shipment['recipientMiddleName'] ?? '',
        ]);

        return implode(' ', $parts) ?: '—';
    }

    /**
     * Повертає назву статусу відправки
     *
     * @param array $shipment Дані відправки
     *
     * @return string Назва статусу
     */
    public static function formatStatus(array $shipment): string
    {
        return $shipment['lastStatusName']
            ?? $shipment['statusName']
            ?? $shipment['status']
            ?? '—';
    }

    /**
     * Форматує вагу в зрозумілий рядок
     *
     * @param array $shipment Дані відправки
     *
     * @return string Відформатована вага
     */
    public static function formatWeight(array $shipment): string
    {
        // Вага зберігається в грамах
        $grams = $shipment['weight'] ?? null;

        if ($grams === null) {
            return '—';
        }

        if ($grams >= 1000) {
            return number_format($grams / 1000, 3, '.', ' ') . ' кг';
        }

        return $grams . ' г';
    }

    /**
     * Форматує оголошену вартість
     *
     * @param array $shipment Дані відправки
     *
     * @return string Відформатована вартість
     */
    public static function formatDeclaredPrice(array $shipment): string
    {
        $price = $shipment['declaredPrice'] ?? $shipment['postPay'] ?? null;

        if ($price === null || $price == 0) {
            return '—';
        }

        return number_format($price / 100, 2, '.', ' ') . ' грн';
    }

    /**
     * Форматує дату створення
     *
     * @param array $shipment Дані відправки
     *
     * @return string Відформатована дата
     */
    public static function formatCreatedDate(array $shipment): string
    {
        $raw = $shipment['createTime']
            ?? $shipment['creationDate']
            ?? $shipment['dateCreated']
            ?? null;

        if ($raw === null) {
            return '—';
        }

        // Обробка мілісекунд (UNIX timestamp)
        if (is_numeric($raw)) {
            $ts = (int)($raw > 1e10 ? $raw / 1000 : $raw);
            return date('d.m.Y H:i', $ts);
        }

        // Обробка ISO 8601 рядків
        try {
            $dt = new \DateTime($raw);
            return $dt->format('d.m.Y H:i');
        } catch (\Exception $e) {
            return htmlspecialchars($raw, ENT_QUOTES, 'UTF-8');
        }
    }
}
