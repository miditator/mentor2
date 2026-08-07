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
    window.showAiLoader("ИИ составляет задание...")

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
                    <button onclick="showTaskHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1;">Подсказка</button>
                    <button onclick="showNewTaskMode(true)" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Поменять</button>
                `;

                showTaskCard(`
                    <!-- 🔥 Текст задания сделан крупнее и жирнее (font-weight: 900) -->
                    <div style="font-size: 22px; font-weight: 900; color: var(--text-color); margin-bottom: 16px; word-wrap: break-word; line-height: 1.3;">${data.phrase}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div class="task-word-badge">
                            <b style="font-size: 15px;">Слово:</b> <i>${taskState.targetWord.split('(')[0].trim()}</i>
                        </div>
                        
                        <!-- 🔥 ИНТЕРАКТИВНОЕ ПРАВИЛО -->
                        <div class="task-rule-badge" onmousedown="event.preventDefault()" onclick="showTaskRuleTooltip('${taskState.rule.replace(/'/g, "\\'")}')">
                            <span><b style="font-size: 15px;">Тема:</b> <i>${taskState.rule}</i></span>
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
        })
      .finally(() => {
        // 🔥 Плавное скрытие анимированного бабла мыслей
        window.hideAiLoader();
    });
}



function showTaskHelp() {
    taskState.helpClicks++;
    let step = taskState.helpClicks;

    // 🔥 Убрали блок с "🤖 ИИ готовит подсказку...", чтобы карточка не мигала

    // Прячем поле ввода ТОЛЬКО если это кнопка "Сдаюсь" (шаг 2).
    if (step > 1) {
        document.getElementById('text-input-row').style.display = 'none';
    }
    window.showAiLoader("ИИ думает...");

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
                    <button onclick="showTaskHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1; background: rgba(255, 59, 48, 0.1); border-color: rgba(255, 59, 48, 0.3); color: #ff3b30;">Сдаюсь</button>
                    <button onclick="showNewTaskMode(true)" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Поменять</button>
                `;
                showTaskCard(`
                    <!-- 🔥 Текст задания с повышенной жирностью -->
                    <div style="font-size: 22px; font-weight: 900; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word;">${taskState.phrase}</div>
                    
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 12px; border-radius: 10px; text-align: left; margin-bottom: 5px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: bold; color: #ff9f0a; margin-bottom: 4px;">💡 Подсказка:</div>
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `, buttons);
                document.getElementById('text-input-row').style.display = 'flex';
                // Фокус останется на месте автоматически
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
    })
    .finally(() => {
        // 🔥 Плавное скрытие анимированного бабла мыслей
        window.hideAiLoader();
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
            let btnNext = `<button onclick="showNewTaskMode(true)" class="btn-glass btn-glass-blue" style="width: 100%; height: 46px;">🔄 Ещё 1 фразу</button>`;
            let middleContent = '';

            let oldPercent = 0;
            let newPercent = 0;
            const langCode = window.userProfile?.language || 'en';
            const pbTitle = langCode === 'de' ? 'Grammatik üben' : 'Тренировка фраз';

            if (data.is_correct) {
                const previousPhrases = window.userProfile ? (window.userProfile.phrases_today || 0) : 0;
                const goal = window.userProfile?.phrases_per_day || 10;

                oldPercent = Math.min(Math.round((previousPhrases / goal) * 100), 100);
                const newPhrases = previousPhrases + 1;
                newPercent = Math.min(Math.round((newPhrases / goal) * 100), 100);

                if (window.userProfile) {
                    window.userProfile.phrases_today = newPhrases;
                }

                middleContent = `
                    <div class="pb-main-container" style="flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-bottom: 15px; padding: 20px 15px;">
                        <div class="pb-avatar" style="margin: 0 auto 15px auto; width: 76px; height: 76px;">
                            <img src="frontend/img/mentor.jpg" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="pb-row" style="width: 100%;">
                            <div class="pb-header">
                                <span class="pb-title">${pbTitle}</span>
                                <span class="pb-value" id="task-pb-value">${oldPercent}%</span>
                            </div>
                            <div class="pb-track">
                                <div class="pb-fill" id="task-pb-fill" style="width: ${oldPercent}%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                            </div>
                        </div>
                    </div>

                    <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">✅ Перевод принят:</div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(52, 199, 89, 0.3); text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 15px; color: var(--text-color); font-weight: 500; word-wrap: break-word;">${text}</div>
                    </div>
                `;
            } else {
                // Экранируем кавычки для обеих строк
                const safePhraseAttr = taskState.phrase.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safeAnswerAttr = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                middleContent = `
                    <div style="font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">❌ Твой ответ:</div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 59, 48, 0.3); text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                        <div style="font-size: 15px; color: var(--text-color);">${text}</div>
                    </div>

                    <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Разбор ошибки:</div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 10px; border-left: 4px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                    
                    <!-- 🔥 Встроенное поле для чата с ИИ (ПЕРЕДАЕМ ДВА АРГУМЕНТА) -->
                    <div style="width: 100%; margin-bottom: 5px; position: relative;">
                        <input type="text" id="inline-error-chat-input" onkeypress="if(event.key==='Enter') triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" placeholder="Спросить ИИ об ошибке..." style="width: 100%; height: 46px; padding: 0 45px 0 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        <button onclick="triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; background: var(--button-color); border: none; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                `;
            }

            showSpaciousTaskCard(`
                <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                <div style="font-size: 16px; font-weight: bold; color: var(--text-color); margin-bottom: 6px; word-wrap: break-word;">${taskState.phrase}</div>
                <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 12px;">Тема: ${taskState.rule}</div>
                
                ${middleContent}
            `, btnNext);

            if (data.is_correct) {
                setTimeout(() => {
                    const bar = document.getElementById('task-pb-fill');
                    if (bar) bar.style.width = `${newPercent}%`;

                    const valueEl = document.getElementById('task-pb-value');
                    const duration = 1000;
                    const startTime = performance.now();

                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easeProgress = 1 - Math.pow(1 - progress, 3);

                        const currentVal = Math.round(oldPercent + (newPercent - oldPercent) * easeProgress);
                        if (valueEl) valueEl.innerText = `${currentVal}%`;

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        }
                    }
                    requestAnimationFrame(updateCounter);
                }, 100);
            }

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
                    <button onclick="showTaskHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1;">Подсказка</button>
                    <button onclick="showNewTaskMode(true)" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Поменять</button>
                `;

                showTaskCard(`
                    <!-- 🔥 Текст задания сделан крупнее и жирнее (font-weight: 900) -->
                    <div style="font-size: 22px; font-weight: 900; color: var(--text-color); margin-bottom: 16px; word-wrap: break-word; line-height: 1.3;">${data.phrase}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div class="task-word-badge">
                            <b style="font-size: 15px;">Слово:</b> <i>${taskState.targetWord.split('(')[0].trim()}</i>
                        </div>
                        
                        <!-- 🔥 ИНТЕРАКТИВНОЕ ПРАВИЛО -->
                        <div class="task-rule-badge" onmousedown="event.preventDefault()" onclick="showTaskRuleTooltip('${taskState.rule.replace(/'/g, "\\'")}')">
                            <span><b style="font-size: 15px;">Тема:</b> <i>${taskState.rule}</i></span>
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

