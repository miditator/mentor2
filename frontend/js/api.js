// js/api.js



const BASE_URL = 'https://mentorapp.duckdns.org/api';

// Функция для выполнения запросов
function apiFetch(endpoint, options = {}) {
    return fetch(`${BASE_URL}${endpoint}`, options)
        .then(response => {
            if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
            return response.json();
        });



}

