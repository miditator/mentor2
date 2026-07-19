// ==========================================
// РЕЖИМ: НОВОЕ ЗАДАНИЕ (tasks.js)
// ==========================================

let taskState = {
    helpClicks: 0,
    phrase: "",
    rule: "",
    targetWord: "" // Добавили хранение целевого слова
};

// 🎯 Функция для отрисовки карточки задания (теперь принимает кастомные кнопки)
function showTaskCard(htmlContent, buttonsHtml = '') {
    const chatContainer = document.getElementById('chat-messages');

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; text-align: center;">
            <div style="width: 100%;">
                ${htmlContent}
            </div>
            
            ${buttonsHtml}
        </div>`;
}

function showNewTaskMode(forceNew = false) {
    window.currentAppMode = 'task';
    setAppHeader('🎯 Новое задание', true);

    taskState.helpClicks = 0;

    // 🔥 Прячем всё лишнее, включая ПЛАВАЮЩУЮ КНОПКУ (Goal 1)
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';

    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('confirm-row')) document.getElementById('confirm-row').style.display = 'none';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Напиши перевод...";
    }

    showTaskCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ составляет предложение...</div>
    `);

    const url = `/tasks/new?chat_id=${user.id}${forceNew ? '&force=true' : ''}`;

    apiFetch(url)
        .then(data => {
            if (window.currentAppMode !== 'task') return;
            if (data.success) {
                taskState.phrase = data.phrase;
                taskState.rule = data.rule || "General Grammar";
                taskState.targetWord = data.target_word || "базовое слово"; // Получаем слово

                const langName = window.userProfile?.language === 'de' ? 'немецкий' : 'английский';

                // 🔥 Кнопки Хелп и Поменять фразу (Goal 3)
                let buttons = `
                    <div style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">
                        <button onclick="showTaskHelp()" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">💡 Подсказка</button>
                        <button onclick="showNewTaskMode(true)" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">🔄 Другая фраза</button>
                    </div>
                `;

                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${data.phrase}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 14px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 10px; border-radius: 8px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box;">
                            <b>📌 Слово:</b> ${taskState.targetWord}
                        </div>
                        <div style="font-size: 14px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 10px; border-radius: 8px; border-left: 4px solid var(--button-color); text-align: left; width: 100%; box-sizing: border-box;">
                            <b>📚 Тема:</b> ${taskState.rule}
                        </div>
                    </div>
                `, buttons);
                if (userInput) userInput.focus();
            } else {
                showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка генерации: ${data.error}</div>`);
            }
        })
        .catch(err => {
            showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка связи с сервером.</div>`);
        });
}

function showTaskHelp() {
    taskState.helpClicks++;
    let step = taskState.helpClicks;

    showTaskCard(`
        <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
        <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${taskState.phrase}</div>
        <div style="text-align: center; color: var(--hint-color); margin-top: 15px;">
            <span style="font-size: 24px;">🤖</span><br>ИИ готовит ${step === 1 ? 'подсказку' : 'ответ'}...
        </div>
    `);

    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/tasks/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, step: step })
    }).then(data => {
        if (window.currentAppMode !== 'task') return;
        if (data.success) {
            if (step === 1) {
                let buttons = `
                    <div style="display: flex; gap: 10px; width: 100%; margin-top: 15px;">
                        <button onclick="showTaskHelp()" style="flex: 1; padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: 10px; color: #ff3b30; font-size: 14px; border: 1px solid rgba(255, 59, 48, 0.2); cursor: pointer;">🆘 Сдаюсь</button>
                        <button onclick="showNewTaskMode(true)" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">🔄 Другая фраза</button>
                    </div>
                `;
                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 15px; border-radius: 12px; text-align: left; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #ff9f0a; margin-bottom: 8px;">💡 Подсказка:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                `, buttons);
                document.getElementById('text-input-row').style.display = 'flex';
                document.getElementById('user-input').focus();
            } else {
                let btnNext = `<button onclick="showNewTaskMode(true)" class="btn-primary" style="margin-top: 15px;">🔄 Ещё 1 фразу</button>`;
                showTaskCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Исходная фраза:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 15px; border-radius: 12px; text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #34c759; margin-bottom: 8px;">📖 Правильный ответ:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                `, btnNext);
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

    // 🔥 Передаем rule на бэкенд для строгой проверки
    apiFetch('/tasks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, answer: text, rule: taskState.rule })
    }).then(data => {
        if (window.currentAppMode !== 'task') return;
        if (data.success) {
            let btnNext = `<button onclick="showNewTaskMode(true)" class="btn-primary" style="margin-top: 15px;">🔄 Ещё 1 фразу</button>`;

            let statusIcon = data.is_correct ? "✅" : "❌";
            let statusColor = data.is_correct ? "#34c759" : "#ff3b30";

            // 🔥 Формируем расширенную карточку проверки (Goal 4)
            showTaskCard(`
                <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">${taskState.phrase}</div>
                <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 20px;">Тема: ${taskState.rule}</div>
                
                <div style="font-size: 50px; margin-bottom: 15px;">${statusIcon}</div>
                
                <div style="background: rgba(112, 132, 153, 0.05); padding: 15px; border-radius: 12px; border-left: 4px solid ${statusColor}; text-align: left; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                </div>
            `, btnNext); // Выводим кнопку "Еще 1 фразу" вместо Help

        } else {
            showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка проверки: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showTaskCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}