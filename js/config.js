/**
 * config.js — Конфігурація для роботи з API Укрпошти
 */

const CONFIG = {
    // Bearer-токен eCom API (для відправок)
    BEARER_ECOM: '917c7bdc-3b41-3a69-b45d-3ebc4005dded',

    // Bearer-токен StatusTracking API (для відстеження статусів)
    BEARER_STATUS: 'bb79c67b-e624-3522-9253-b459e982f2f5',

    // Токен контрагента
    COUNTERPARTY_TOKEN: 'b369f749-aad1-4827-a4cb-a3972bcf953a',

    // UUID контрагента
    COUNTERPARTY_UUID: '30ff87a7-f116-4e5b-8d2b-d3821b50e790',

    // Поштовий індекс відправника
    SENDER_POSTCODE: '79060',

    // Середовище: 'production' або 'sandbox'
    ENV: 'production'
};
