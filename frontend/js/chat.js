// ==========================================
// ФАЙЛ: frontend/js/chat.js
// ==========================================

let liveChatHistory = [];

function startLiveChatFromMenu() {
    const input = document.getElementById('live-chat-input');
    const text = input ? input.value.trim() : '';
    if (input) input.value = '';

    showLiveChatMode();

    // Если пользователь что-то ввел в меню, сразу отправляем
    if (text) {
        document.getElementById('user-input').value = text;
        document.getElementById('btn-send').click();
    }
}

function showLiveChatMode() {
    window.currentAppMode = 'live_chat';

    setAppHeader('💬 ИИ-Ментор', true);
    liveChatHistory = [];

    // Прячем элементы главного меню
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    // Очищаем чат и настраиваем Flex-контейнер
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.style.display = 'flex';
    chatContainer.style.flexDirection = 'column';
    chatContainer.innerHTML = `
        <div style="text-align: center; color: var(--hint-color); font-size: 13px; margin: 15px 0 20px 0; background: rgba(112, 132, 153, 0.1); padding: 6px 12px; border-radius: 12px; display: inline-block; align-self: center;">
            Поздоровайся с ментором! Твои сообщения и аудио будут обработаны, а ошибки аккуратно исправлены.
        </div>
    `;

    // Показываем стандартную строку ввода (кнопка микрофона автоматически подтянется!)
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.placeholder = "Сообщение...";
        userInput.focus();
    }
}

// 🔥 Кастомная отрисовка пузырей в стиле Telegram
function addTelegramStyleMessage(text, isUser = false) {
    const chatMessages = document.getElementById('chat-messages');
    const outputArea = document.getElementById('output-area');
    const msgDiv = document.createElement('div');

    // Базовые стили (шрифт, отступы, максимальная ширина)
    msgDiv.style.padding = '10px 14px';
    msgDiv.style.marginBottom = '8px';
    msgDiv.style.fontSize = '15px';
    msgDiv.style.lineHeight = '1.4';
    msgDiv.style.maxWidth = '80%';
    msgDiv.style.wordWrap = 'break-word';
    msgDiv.style.position = 'relative';

    if (isUser) {
        // Стиль пользователя (справа, цвет основной кнопки, хвостик справа внизу)
        msgDiv.style.backgroundColor = 'var(--button-color)';
        msgDiv.style.color = '#ffffff';
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.style.borderRadius = '16px 16px 4px 16px';
    } else {
        // Стиль ИИ (слева, вторичный фон, хвостик слева внизу)
        msgDiv.style.backgroundColor = 'var(--secondary-bg-color)';
        msgDiv.style.color = 'var(--text-color)';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.border = '1px solid rgba(112, 132, 153, 0.15)';
        msgDiv.style.borderRadius = '16px 16px 16px 4px';
    }

    msgDiv.innerHTML = text;
    chatMessages.appendChild(msgDiv);

    if (outputArea) {
        outputArea.scrollTop = outputArea.scrollHeight;
    }
}

function handleLiveChatInput(text) {
    const chatMessages = document.getElementById('chat-messages');
    const outputArea = document.getElementById('output-area');

    // 🔥 Записываем сообщение пользователя в историю
    liveChatHistory.push({ role: "user", content: text });

    const loadingId = 'loading-' + Date.now();
    const loadingHtml = `
        <div id="${loadingId}" style="align-self: flex-start; background: var(--secondary-bg-color); padding: 10px 14px; border-radius: 16px 16px 16px 4px; margin-bottom: 8px; font-size: 15px; border: 1px solid rgba(112, 132, 153, 0.15); color: var(--hint-color); max-width: 80%;">
            <i>🤖 печатает...</i>
        </div>`;
    chatMessages.insertAdjacentHTML('beforeend', loadingHtml);
    outputArea.scrollTop = outputArea.scrollHeight;

    apiFetch('/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🔥 Отправляем на бэкенд всю историю
        body: JSON.stringify({ chat_id: user.id, history: liveChatHistory })
    }).then(data => {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (window.currentAppMode !== 'live_chat') return;

        if (data.success) {
            // 🔥 Записываем ответ ИИ в историю
            liveChatHistory.push({ role: "assistant", content: data.response });
            addTelegramStyleMessage(data.response, false);
        } else {
            addTelegramStyleMessage(`❌ Ошибка: ${data.error}`, false);
            liveChatHistory.pop(); // Удаляем свое сообщение из истории, если произошла ошибка
        }
    }).catch(err => {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        addTelegramStyleMessage(`⚠️ Ошибка сети.`, false);
        liveChatHistory.pop(); // Удаляем свое сообщение из истории, если сеть упала
    });
}