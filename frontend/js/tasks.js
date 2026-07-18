// ==========================================
// РЕЖИМ: НОВОЕ ЗАДАНИЕ (tasks.js)
// ==========================================

let taskState = {
    helpClicks: 0,
    phrase: "",
    rule: ""
};

// 🎯 Функция для отрисовки карточки задания
// 🎯 Функция для отрисовки карточки задания
function showTaskCard(htmlContent, showHelpBtn = false) {
    const chatContainer = document.getElementById('chat-messages');

    let helpBtnHtml = '';
    // Показываем кнопку Help, если кликов меньше 2
    if (showHelpBtn && taskState.helpClicks < 2) {
        let helpText = taskState.helpClicks === 0 ? "💡 Дай подсказку (Словарь)" : "🆘 Сдаюсь (Показать ответ)";
        let btnColor = taskState.helpClicks === 0 ? "rgba(112, 132, 153, 0.1)" : "rgba(255, 59, 48, 0.1)";
        let textColor = taskState.helpClicks === 0 ? "var(--text-color)" : "#ff3b30";

        helpBtnHtml = `
            <button onclick="showTaskHelp()" style="margin-top: 20px; padding: 10px 20px; background: ${btnColor}; border: 1px solid rgba(112, 132, 153, 0.2); border-radius: 10px; color: ${textColor}; font-size: 14px; cursor: pointer; transition: 0.2s;">
                ${helpText}
            </button>
        `;
    }

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; text-align: center;">
            <div style="width: 100%;">
                ${htmlContent}
            </div>
            
            ${helpBtnHtml}
        </div>`;
}

function showNewTaskMode(forceNew = false) {
    window.currentAppMode = 'task';
    setAppHeader('🎯 Новое задание', true);

    taskState.helpClicks = 0; // Сбрасываем счетчик кликов

    // 🔥 Прячем элементы безопасно (с проверкой на существование)
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none'; // Прячем кнопку словаря на всякий случай

    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';

    // Вот здесь скрипт ломался! Теперь он проверяет, есть ли блок, прежде чем его скрывать:
    if (document.getElementById('confirm-row')) document.getElementById('confirm-row').style.display = 'none';

    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'flex';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Напиши перевод...";
    }

    showTaskCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ составляет предложение и тему...</div>
    `);

    const url = `/tasks/new?chat_id=${user.id}${forceNew ? '&force=true' : ''}`;

    apiFetch(url)
        .then(data => {
            if (data.success) {
                taskState.phrase = data.phrase;
                taskState.rule = data.rule || "General Grammar";

                const langName = window.userProfile?.language === 'de' ? 'немецкий' : 'английский';

                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${data.phrase}</div>
                    <div style="font-size: 14px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid var(--button-color); text-align: left; width: 100%;">
                        <b>📚 Topic:</b> ${data.rule || "General Grammar"}
                    </div>
                `, true);
                if (userInput) userInput.focus();
            } else {
                showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка генерации: ${data.error}</div>`);
            }
        })
        .catch(err => {
            showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка связи с сервером.</div>`);
        });
}

// 🎯 ПРАВИЛЬНАЯ ЛОГИКА ПОДСКАЗОК (обращается к /tasks/help)
// 🎯 ПРАВИЛЬНАЯ ЛОГИКА ПОДСКАЗОК (фраза не исчезает!)
function showTaskHelp() {
    taskState.helpClicks++;
    let step = taskState.helpClicks;

    // Карточка ожидания (фраза + статус загрузки)
    showTaskCard(`
        <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
        <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${taskState.phrase}</div>
        <div style="text-align: center; color: var(--hint-color); margin-top: 15px;">
            <span style="font-size: 24px;">🤖</span><br>ИИ готовит ${step === 1 ? 'подсказку' : 'подробный ответ'}...
        </div>
    `, false);

    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/tasks/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, step: step })
    }).then(data => {
        if (data.success) {
            if (step === 1) {
                // Шаг 1: Подсказка (оранжевая карточка)
                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 15px; border-radius: 12px; text-align: left; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #ff9f0a; margin-bottom: 8px;">💡 Подсказка:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                    
                    <div style="font-size: 13px; color: var(--hint-color);">Теперь попробуй перевести 👇</div>
                `, true); // Снова показываем кнопку Help, но уже "Сдаюсь"
                document.getElementById('text-input-row').style.display = 'flex';
                document.getElementById('user-input').focus();
            } else {
                // Шаг 2: Сдался (зеленая карточка)
                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Исходная фраза:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 15px; border-radius: 12px; text-align: left; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #34c759; margin-bottom: 8px;">📖 Правильный ответ:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                    
                    <div style="font-size: 13px; color: var(--hint-color);">Прочитай объяснение и переходи к новому заданию!</div>
                `, false); // false = больше не показываем кнопку Help
            }
        } else {
            showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

function handleTaskInput(text) {
    showTaskCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">🤖</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ проверяет твой вариант...</div>
    `);
    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/tasks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, answer: text })
    }).then(data => {
        if (data.success) {
            if (data.is_correct) {
                // Ответ верный
                showTaskCard(`
                    <div style="font-size: 50px; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 16px; color: var(--text-color); text-align: left; line-height: 1.5;">${data.feedback}</div>
                `);
            } else {
                // Ответ неверный — показываем ошибку и оставляем кнопку Help
                showTaskCard(`
                    <div style="font-size: 50px; margin-bottom: 10px;">❌</div>
                    <div style="font-size: 16px; color: var(--text-color); text-align: left; line-height: 1.5; margin-bottom: 15px;">${data.feedback}</div>
                    <div style="font-size: 13px; color: var(--hint-color);">Можешь попробовать еще раз 👇</div>
                `, true);
                document.getElementById('text-input-row').style.display = 'flex';
                document.getElementById('user-input').focus();
            }
        } else {
            showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка проверки: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

// Добавь эту функцию в tasks.js
async function startVoiceInput() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg' });
        const formData = new FormData();
        formData.append('file', blob);

        // Отправляем аудио на наш новый эндпоинт
        const response = await fetch(`/api/speech/recognize?chat_id=${user.id}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('user-input').value = data.text;
            handleTaskInput(data.text);
        }
    };

    mediaRecorder.start();
    // Визуальный отклик для пользователя, что идет запись
    document.getElementById('user-input').placeholder = "Слушаю...";
    setTimeout(() => mediaRecorder.stop(), 3000);
}