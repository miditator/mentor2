// ==========================================
// ФАЙЛ: frontend/js/tasks.js
// РЕЖИМ: НОВОЕ ЗАДАНИЕ
// ==========================================

let taskState = {
    helpClicks: 0,
    phrase: "",
    rule: "",
    targetWord: "" // Целевое слово
};

// 🎯 Функция для отрисовки карточки задания (компактные отступы, чтобы карточка была выше)
// 🎯 Функция для отрисовки карточки задания (поддерживает компактный и просторный режимы)
function showTaskCard(htmlContent, buttonsHtml = '', isSpacious = false) {

    // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ
    if (window.isRateLimitError(htmlContent)) {
        return window.showLimitCard();
    }
    const chatContainer = document.getElementById('chat-messages');

    let minHeight = isSpacious ? '260px' : '200px';
    let padding = isSpacious ? '25px 20px' : '16px 16px';
    let marginTop = isSpacious ? '15px' : '5px';

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: ${marginTop}; margin-bottom: auto;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: ${minHeight}; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: ${padding}; position: relative; box-sizing: border-box; width: 100%; text-align: center;">
                <div style="width: 100%;">
                    ${htmlContent}
                </div>
                
                ${buttonsHtml ? `<div style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">${buttonsHtml}</div>` : ''}
            </div>
        </div>`;
}

// Вспомогательная функция для просторной карточки результатов
function showSpaciousTaskCard(htmlContent, buttonsHtml = '') {
    showTaskCard(htmlContent, buttonsHtml, true);
}

// 🔥 Запрос новой фразы
function showNewTaskMode(forceNew = true) {
    window.currentAppMode = 'task';
    setAppHeader('Фраза для тренировки', true);

    taskState = {
        helpClicks: 0,
        phrase: "",
        rule: "",
        targetWord: ""
    };

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';

    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('confirm-row')) document.getElementById('confirm-row').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Напиши перевод...";
    }

    showTaskCard(`
        <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
        <div style="font-size: 15px; color: var(--hint-color);">ИИ составляет предложение...</div>
    `);

    const lang = window.userProfile?.language || 'en';
    const userDifficulty = window.userProfile?.difficulty || 'A1';
    let randomRule = "General Grammar";

    if (typeof grammarRulesDict !== 'undefined' && grammarRulesDict[lang]) {
        let allowedRules = [];
        const levels = Object.keys(grammarRulesDict[lang]);

        for (const levelKey of levels) {
            allowedRules.push(...grammarRulesDict[lang][levelKey]);
            if (levelKey.startsWith(userDifficulty)) {
                break;
            }
        }

        if (allowedRules.length === 0) {
            allowedRules = grammarRulesDict[lang][levels[0]];
        }

        randomRule = allowedRules[Math.floor(Math.random() * allowedRules.length)];
    }

    const url = `/tasks/new?chat_id=${user.id}&rule=${encodeURIComponent(randomRule)}${forceNew ? '&force=true' : ''}`;

    apiFetch(url)
        .then(data => {
            if (window.currentAppMode !== 'task') return;
            if (data.success) {
                taskState.phrase = data.phrase;
                taskState.targetWord = data.target_word || "базовое слово";

                const langName = lang === 'de' ? 'немецкий' : 'английский';
                let finalRule = data.rule || "General Grammar";

                if (typeof grammarRulesDict !== 'undefined' && grammarRulesDict[lang]) {
                    const allSystemRules = Object.values(grammarRulesDict[lang]).flat();
                    const searchContext = `${finalRule} ${data.phrase}`.toLowerCase().trim();

                    const matchedRule = allSystemRules.find(r => {
                        const cleanSystemRule = r.toLowerCase().trim();
                        return searchContext.includes(cleanSystemRule) || cleanSystemRule.includes(finalRule.toLowerCase().trim());
                    });

                    if (matchedRule) {
                        finalRule = matchedRule;
                    }
                }

                taskState.rule = finalRule;

                let buttons = `
                    <button onclick="showTaskHelp()" class="btn-glass-orange-soft" style="flex: 1;">💡 Подсказка</button>
                    <button onclick="showNewTaskMode(true)" class="btn-glass-secondary" style="flex: 1;">🔀 Поменять</button>
                `;

                showTaskCard(`
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
                    <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word; line-height: 1.3;">${data.phrase}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                        <div style="font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box;">
                            <b>📌 Слово:</b> <i>${taskState.targetWord.split('(')[0].trim()}</i>
                        </div>
                        
                        <!-- 🔥 ИНТЕРАКТИВНОЕ ПРАВИЛО -->
                        <div onclick="showTaskRuleTooltip('${taskState.rule.replace(/'/g, "\\'")}')" style="cursor: pointer; font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid var(--button-color); text-align: left; width: 100%; box-sizing: border-box; transition: background 0.2s; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='rgba(112, 132, 153, 0.2)'" onmouseout="this.style.background='rgba(112, 132, 153, 0.1)'">
                            <span><b>📚 Тема:</b> <i>${taskState.rule}</i></span>
                            <div class="info-pulse-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                `, buttons);

                if (userInput) userInput.focus();
            } else {
                showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка генерации: ${data.error}</div>`);
            }
        })
        .catch(err => {
            showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка связи с сервером.</div>`);
        });
}

// 🔥 Запрос новой фразы
function showNewTaskMode(forceNew = true) {
    window.currentAppMode = 'task';
    setAppHeader('Фраза для тренировки', true);

    taskState = {
        helpClicks: 0,
        phrase: "",
        rule: "",
        targetWord: ""
    };

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';

    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('confirm-row')) document.getElementById('confirm-row').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Напиши перевод...";
    }

    showTaskCard(`
        <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
        <div style="font-size: 15px; color: var(--hint-color);">ИИ составляет предложение...</div>
    `);

    const lang = window.userProfile?.language || 'en';
    const userDifficulty = window.userProfile?.difficulty || 'A1';
    let randomRule = "General Grammar";

    if (typeof grammarRulesDict !== 'undefined' && grammarRulesDict[lang]) {
        let allowedRules = [];
        const levels = Object.keys(grammarRulesDict[lang]);

        for (const levelKey of levels) {
            allowedRules.push(...grammarRulesDict[lang][levelKey]);
            if (levelKey.startsWith(userDifficulty)) {
                break;
            }
        }

        if (allowedRules.length === 0) {
            allowedRules = grammarRulesDict[lang][levels[0]];
        }

        randomRule = allowedRules[Math.floor(Math.random() * allowedRules.length)];
    }

    const url = `/tasks/new?chat_id=${user.id}&rule=${encodeURIComponent(randomRule)}${forceNew ? '&force=true' : ''}`;

    apiFetch(url)
        .then(data => {
            if (window.currentAppMode !== 'task') return;
            if (data.success) {
                taskState.phrase = data.phrase;
                taskState.targetWord = data.target_word || "базовое слово";

                const langName = lang === 'de' ? 'немецкий' : 'английский';
                let finalRule = data.rule || "General Grammar";

                if (typeof grammarRulesDict !== 'undefined' && grammarRulesDict[lang]) {
                    const allSystemRules = Object.values(grammarRulesDict[lang]).flat();
                    const searchContext = `${finalRule} ${data.phrase}`.toLowerCase().trim();

                    const matchedRule = allSystemRules.find(r => {
                        const cleanSystemRule = r.toLowerCase().trim();
                        return searchContext.includes(cleanSystemRule) || cleanSystemRule.includes(finalRule.toLowerCase().trim());
                    });

                    if (matchedRule) {
                        finalRule = matchedRule;
                    }
                }

                taskState.rule = finalRule;

                // Кнопка изменена на "🔀 Поменять"
                let buttons = `
                    <button onclick="showTaskHelp()" class="btn-glass-orange-soft" style="flex: 1;">💡 Подсказка</button>
                    <button onclick="showNewTaskMode(true)" class="btn-glass-secondary" style="flex: 1;">🔀 Поменять</button>
                `;

                showTaskCard(`
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
                    <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word; line-height: 1.3;">${data.phrase}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                        <div style="font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box;">
                            <b>📌 Слово:</b> <i>${taskState.targetWord.split('(')[0].trim()}</i>
                        </div>
                        
                        <!-- 🔥 ИНТЕРАКТИВНОЕ ПРАВИЛО -->
                        <div onclick="showTaskRuleTooltip('${taskState.rule.replace(/'/g, "\\'")}')" style="cursor: pointer; font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid var(--button-color); text-align: left; width: 100%; box-sizing: border-box; transition: background 0.2s; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='rgba(112, 132, 153, 0.2)'" onmouseout="this.style.background='rgba(112, 132, 153, 0.1)'">
                            <span><b>📚 Тема:</b> <i>${taskState.rule}</i></span>
                            <div class="info-pulse-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                `, buttons);

                if (userInput) userInput.focus();
            } else {
                showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка генерации: ${data.error}</div>`);
            }
        })
        .catch(err => {
            showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка связи с сервером.</div>`);
        });
}

function showTaskHelp() {
    taskState.helpClicks++;
    let step = taskState.helpClicks;

    showTaskCard(`
        <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
        <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${taskState.phrase}</div>
        <div style="text-align: center; color: var(--hint-color); margin-top: 10px;">
            <span style="font-size: 20px;">🤖</span><br>ИИ готовит ${step === 1 ? 'подсказку' : 'ответ'}...
        </div>
    `);

    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/tasks/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            step: step,
            rule: taskState.rule,
            target_word: taskState.targetWord
        })
    }).then(data => {
        if (window.currentAppMode !== 'task') return;
        if (data.success) {
            if (step === 1) {
                let buttons = `
                    <button onclick="showTaskHelp()" class="btn-glass-orange-soft" style="flex: 1; background: rgba(255, 59, 48, 0.1); border-color: rgba(255, 59, 48, 0.3); color: #ff3b30;">🆘 Сдаюсь</button>
                    <button onclick="showNewTaskMode(true)" class="btn-glass-secondary" style="flex: 1;">🔀 Поменять</button>
                `;
                showTaskCard(`
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Переведи:</div>
                    <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; word-wrap: break-word;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 12px; border-radius: 10px; text-align: left; margin-bottom: 5px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: bold; color: #ff9f0a; margin-bottom: 4px;">💡 Подсказка:</div>
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `, buttons);
                document.getElementById('text-input-row').style.display = 'flex';
                document.getElementById('user-input').focus();
            } else {
                let btnNext = `<button onclick="showNewTaskMode(true)" class="btn-glass btn-glass-green" style="width: 100%; height: 46px;">🔄 Ещё 1 фразу</button>`;
                showTaskCard(`
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Исходная фраза:</div>
                    <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; word-wrap: break-word;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 12px; border-radius: 10px; text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: bold; color: #34c759; margin-bottom: 4px;">📖 Правильный ответ:</div>
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `, btnNext);
            }
        } else {
            showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

function handleTaskInput(text) {
    showTaskCard(`
        <div style="font-size: 32px; margin-bottom: 10px;">🤖</div>
        <div style="font-size: 15px; color: var(--hint-color);">ИИ проверяет твой вариант...</div>
    `);
    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/tasks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, answer: text, rule: taskState.rule, target_word: taskState.targetWord })
    }).then(data => {
        if (window.currentAppMode !== 'task') return;
        if (data.success) {
            // Синяя кнопка перехода к следующей фразе
            let btnNext = `<button onclick="showNewTaskMode(true)" class="btn-glass btn-glass-blue" style="width: 100%; height: 46px;">🔄 Ещё 1 фразу</button>`;

            let middleContent = '';

            if (data.is_correct) {

                // 🔥 Вставляем в обработчик успешного ответа (где data.is_correct === true)
                if (window.userProfile) {
                    // Увеличиваем счетчик фраз на 1 локально
                    window.userProfile.phrases_today = (window.userProfile.phrases_today || 0) + 1;

                    // Мгновенно перерисовываем прогресс-бары в шапке
                    if (typeof initProgressBars === 'function') {
                        initProgressBars();
                    }
                }
                // Убираем галочку, отображаем введенный пользователем перевод в красивом блоке
                middleContent = `
                    <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">✅ Перевод принят:</div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(52, 199, 89, 0.3); text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 15px; color: var(--text-color); font-weight: 500; word-wrap: break-word;">${text}</div>
                    </div>
                `;
            } else {
                // Ошибка: выводим крестик и фидбек с ошибкой
                middleContent = `
                    <div style="font-size: 32px; margin-bottom: 8px;">❌</div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 12px; border-radius: 10px; border-left: 4px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `;
            }

            // Используем просторную карточку (showSpaciousTaskCard), так как клавиатуры нет
            showSpaciousTaskCard(`
                <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                <div style="font-size: 16px; font-weight: bold; color: var(--text-color); margin-bottom: 6px; word-wrap: break-word;">${taskState.phrase}</div>
                <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 12px;">Тема: ${taskState.rule}</div>
                
                ${middleContent}
            `, btnNext);

        } else {
            showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка проверки: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showTaskCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

// ==========================================
// 🔥 ПОДСКАЗКА ПРАВИЛА (ДЛЯ ЗАДАНИЙ)
// ==========================================

function showTaskRuleTooltip(ruleName) {
    const modal = document.getElementById('task-rule-tooltip');
    const title = document.getElementById('task-rule-tooltip-title');
    const content = document.getElementById('task-rule-tooltip-content');

    const lang = window.userProfile?.language || 'en';
    let explanationText = "Объяснение пока не добавлено.";
    if (typeof grammarExplanations !== 'undefined' && grammarExplanations[lang] && grammarExplanations[lang][ruleName]) {
        explanationText = grammarExplanations[lang][ruleName];
    }

    title.innerText = ruleName;
    content.innerHTML = explanationText;

    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function closeTaskRuleTooltip() {
    const modal = document.getElementById('task-rule-tooltip');
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 200);
}

// 🔥 Рендер уже существующего (активного) задания из базы без повторного запроса к ИИ
function showExistingTask(activeTask) {
    window.currentAppMode = 'task';
    setAppHeader('Фраза для тренировки', true);

    taskState = {
        helpClicks: activeTask.help_count || 0,
        phrase: activeTask.phrase,
        rule: activeTask.rule || "General Grammar",
        targetWord: activeTask.target_word || "базовое слово"
    };

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';

    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'flex';
    if (document.getElementById('text-input-row')) document.getElementById('text-input-row').style.display = 'flex';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('confirm-row')) document.getElementById('confirm-row').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Напиши перевод...";
    }

    const lang = window.userProfile?.language || 'en';
    const langName = lang === 'de' ? 'немецкий' : 'английский';

    let buttons = `
        <button onclick="showTaskHelp()" class="btn-glass-orange-soft" style="flex: 1;">💡 Подсказка</button>
        <button onclick="showNewTaskMode(true)" class="btn-glass-secondary" style="flex: 1;">🔀 Поменять</button>
    `;

    showTaskCard(`
        <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
        <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word; line-height: 1.3;">${activeTask.phrase}</div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
            <div style="font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box;">
                <b>📌 Слово:</b> <i>${taskState.targetWord.split('(')[0].trim()}</i>
            </div>
            
            <!-- 🔥 ИНТЕРАКТИВНОЕ ПРАВИЛО -->
            <div onclick="showTaskRuleTooltip('${taskState.rule.replace(/'/g, "\\'")}')" style="cursor: pointer; font-size: 12px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 10px; border-left: 4px solid var(--button-color); text-align: left; width: 100%; box-sizing: border-box; transition: background 0.2s; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='rgba(112, 132, 153, 0.2)'" onmouseout="this.style.background='rgba(112, 132, 153, 0.1)'">
                <span><b>📚 Тема:</b> <i>${taskState.rule}</i></span>
                <div class="info-pulse-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </div>
            </div>
        </div>
    `, buttons);

    if (userInput) userInput.focus();
}

