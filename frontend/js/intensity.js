// ==========================================
// ФАЙЛ: frontend/js/intensity.js
// ==========================================

let intensityState = {
    word: "",
    currentTask: null, // 🔥 Теперь здесь лежит 1 текущая задача
    currentIndex: 0,
    score: 0,
    langName: "", // 'английский' или 'немецкий'
    meanings: []  // Сохраняем переданные значения
};

// 🔥 УНИВЕРСАЛЬНЫЙ HTML ДЛЯ АНИМИРОВАННОЙ ИКОНКИ ЗАГРУЗКИ В СТИЛЕ КАРТОЧЕК ЗАДАНИЙ
const intensityLoaderHTML = `
    <style>
        @keyframes pulseIntensitySmall {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    </style>
    <div style="display: flex; justify-content: center; align-items: center; width: 48px; height: 48px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; color: #34d399; animation: pulseIntensitySmall 2s infinite; margin: 0 auto 12px auto;">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 26H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M6 22L12 15L18 19L26 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 8H26V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </div>
`;

// 1. ВХОД В РЕЖИМ (ОЖИДАНИЕ СЛОВА)
function showIntensitySetupMode() {
    window.currentAppMode = 'intensity_setup';
    setAppHeader('Интенсив со словом', true);

    document.getElementById('mini-profile').style.display = 'none';
    document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    document.getElementById('input-container').style.display = 'flex';
    document.getElementById('text-input-row').style.display = 'flex';

    const userInput = document.getElementById('user-input');
    userInput.value = '';
    userInput.placeholder = "Введите слово...";

    const langCode = window.userProfile?.language || 'en';
    const langName = langCode === 'de' ? 'Немецкий' : 'Английский';
    const langFlag = langCode === 'de' ? '🇩🇪' : '🇬🇧';
    const langPrepositional = langCode === 'de' ? 'немецком' : 'английском';
    const difficulty = window.userProfile?.difficulty || 'A1';

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div class="card" style="margin-top: 5px;">
            
            <div style="width: 56px; height: 56px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.1); color: #34d399;">
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 26H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M6 22L12 15L18 19L26 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 8H26V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>

            <div style="font-size: 18px; font-weight: 500; color: var(--text-color); margin-bottom: 6px;">Режим Интенсива</div>
            
            <div style="background: rgba(0, 0, 0, 0.25); padding: 10px 14px; border-radius: 12px; margin-bottom: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.04);">
                Тренируем: <b>${langName} ${langFlag}</b> &nbsp;|&nbsp; Уровень: <b>${difficulty}</b>
            </div>

            <div style="font-size: 13px; color: var(--hint-color); line-height: 1.4;">
                Напиши любое слово на <b>${langPrepositional}</b> языке. ИИ придумает с ним 5 предложений твоего уровня сложности!
            </div>
        </div>
    `;
    userInput.focus();
}

function startIntensity(word) {
    intensityState.word = word.trim();
    if (!intensityState.word) return;

    intensityState.score = 0;
    intensityState.currentIndex = 0; // Это и есть наш шаг

    window.currentAppMode = 'intensity_active';
    loadNextIntensityTask();
}

function loadNextIntensityTask() {
    if (intensityState.currentIndex >= 5) {
        showIntensityResult();
        return;
    }

    const chatContainer = document.getElementById('chat-messages');
    document.getElementById('text-input-row').style.display = 'none';

    // На шаге 0 ИИ может переводить слово, поэтому текст загрузки чуть другой
    let loadingText = intensityState.currentIndex === 0
        ? `ИИ анализирует слово <b>${intensityState.word}</b> и готовит интенсив...`
        : `ИИ генерирует фразу ${intensityState.currentIndex + 1} из 5 со словом <b>${intensityState.word}</b>...`;

    chatContainer.innerHTML = `
        <div class="card" style="margin-top: 10px;">
            ${intensityLoaderHTML}
            <div style="font-size: 14px; color: var(--hint-color); line-height: 1.4;">${loadingText}</div>
        </div>
    `;

    const difficulty = window.userProfile?.difficulty || 'A1';

    apiFetch('/intensity/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            word: intensityState.word,
            difficulty: difficulty,
            step: intensityState.currentIndex,
            meanings: intensityState.meanings // 👈 Отправляем значения (на шаге 0 он пустой)
        })
    }).then(data => {
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard();
        }

        if (data.success) {
            // 🔥 СОХРАНЯЕМ ЗНАЧЕНИЯ, ЧТОБЫ НЕ ПЕРЕВОДИТЬ СЛОВО СНОВА
            if (data.meanings && intensityState.currentIndex === 0) {
                intensityState.meanings = data.meanings;
            }

            intensityState.currentTask = data.task;
            showIntensityPhrase();
        } else {
            chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">❌ Ошибка: ${data.error}</div>`;
            document.getElementById('text-input-row').style.display = 'flex';
            window.currentAppMode = 'intensity_setup';
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">⚠️ Ошибка сети.</div>`;
        document.getElementById('text-input-row').style.display = 'flex';
        window.currentAppMode = 'intensity_setup';
    });
}

// 3. ПОКАЗ ОЧЕРЕДНОЙ ФРАЗЫ (ЕДИНСТВЕННАЯ ЖЁЛТАЯ КНОПКА "ПОДСКАЗКА")
function showIntensityPhrase() {
    const currentTask = intensityState.currentTask; // 🔥 Берем текущую задачу
    const chatContainer = document.getElementById('chat-messages');

    document.getElementById('text-input-row').style.display = 'flex';
    const userInput = document.getElementById('user-input');
    userInput.value = '';
    userInput.placeholder = "Перевод...";
    userInput.focus();

    const langCode = window.userProfile?.language || 'en';
    const langName = langCode === 'de' ? 'немецкий' : 'английский';
    const langFlag = langCode === 'de' ? '🇩🇪' : '🇬🇧';

    intensityState.helpClicks = 0;

    // Жёлтая кнопка "Подсказка", отцентрированная и имеющая размер половины строки
    let buttons = `
        <div style="display: flex; justify-content: center; width: 100%;">
            <button onclick="showIntensityHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="width: 50%;">Подсказка</button>
        </div>
    `;

    chatContainer.innerHTML = `
        <div class="card" style="margin-top: 10px; text-align: left;">
            
            <!-- Шапка: Прогресс -->
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 4px;">
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 0.5px;">
                    Переведи на ${langName} ${langFlag}:
                </div>
                <div style="font-size: 11px; color: var(--text-color); background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 4px 10px; border-radius: 10px; text-transform: uppercase;">
                    Фраза ${intensityState.currentIndex + 1} / 5
                </div>
            </div>

            <!-- Задание -->
            <div style="font-size: 20px; font-weight: 500; color: var(--text-color); margin-bottom: 14px; line-height: 1.3; word-wrap: break-word;">
                ${currentTask.translation}
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; margin-bottom: 6px;">
                <!-- ИНТЕРАКТИВНОЕ ПРАВИЛО -->
                <div class="task-rule-badge" onmousedown="event.preventDefault()" onclick="showTaskRuleTooltip('${currentTask.rule.replace(/'/g, "\\'")}')">
                    <span><b style="font-size: 13px;">Тема:</b> <i>${currentTask.rule}</i></span>
                    <div class="info-pulse-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                    </div>
                </div>
            </div>
            
            <div style="width: 100%; margin-top: 10px;">
                ${buttons}
            </div>
        </div>
    `;
}

// 4. ПРОВЕРКА ОТВЕТА
function handleIntensityInput(text) {
    const currentTask = intensityState.currentTask; // 🔥 Берем текущую задачу
    const chatContainer = document.getElementById('chat-messages');

    chatContainer.innerHTML = `
        <div class="card" style="margin-top: 10px;">
            ${intensityLoaderHTML}
            <div style="font-size: 14px; color: var(--hint-color);">ИИ-Ментор проверяет твой перевод...</div>
        </div>
    `;

    apiFetch('/intensity/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            original_foreign_phrase: currentTask.phrase,
            russian_task_phrase: currentTask.translation,
            user_answer: text,
            rule: currentTask.rule,            // 🔥 ДОБАВИЛИ
            target_word: intensityState.word   // 🔥 ДОБАВИЛИ
        })
    }).then(data => {
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard();
        }

        if (data.success) {
            let resultHTML = '';
            let buttonHTML = '';

            if (data.is_correct) {
                    intensityState.score++;

                    if (window.userProfile) {
                        window.userProfile.phrases_today = (window.userProfile.phrases_today || 0) + 1;
                    }

                    resultHTML = `
                        <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">✅ Отлично:</div>
                        <div style="background: rgba(52, 199, 89, 0.1); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(52, 199, 89, 0.3); text-align: left; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 15px; color: var(--text-color);">${text}</div>
                        </div>
                    `;

                    buttonHTML = `
                        <div style="margin-top: 15px; font-size: 13px; color: var(--hint-color); text-align: center;">
                            Переходим дальше... ⏳
                        </div>
                    `;

                    setTimeout(() => {
                        if (window.currentAppMode === 'intensity_active') {
                            nextIntensityStep();
                        }
                    }, 1500);

                } else {
                    const safePhraseAttr = currentTask.translation.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const safeAnswerAttr = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    // 🔥 Достаем правильную фразу
                    const correctVariant = data.correct_phrase || data.correct_answer || data.correct_variant;

                    resultHTML = `
                        <div style="font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">❌ Твой ответ:</div>
                        <div style="background: rgba(255, 59, 48, 0.1); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 59, 48, 0.3); text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                            <div style="font-size: 15px; color: var(--text-color);">${text}</div>
                        </div>

                        <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Разбор ошибки:</div>
                        <div style="background: rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 12px; border-left: 4px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: ${correctVariant ? '12px' : '15px'};">
                            <div style="font-size: 14px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                        </div>
                    `;

                    // 🔥 НОВЫЙ БЛОК: Показываем эталонный ответ с зеленой плашкой
                    if (correctVariant) {
                        resultHTML += `
                            <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">✅ Как нужно было сказать:</div>
                            <div style="background: rgba(52, 199, 89, 0.1); padding: 12px 16px; border-radius: 10px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-color); line-height: 1.4; word-wrap: break-word;">${correctVariant}</div>
                            </div>
                        `;
                    }

                    // Кнопка вызова встроенного чата
                    resultHTML += `
                        <!-- 🔥 Встроенное поле для чата с ИИ -->
                        <div style="width: 100%; margin-bottom: 15px; position: relative;">
                            <input type="text" id="inline-error-chat-input" onkeypress="if(event.key==='Enter') triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" placeholder="Спросить ИИ об ошибке..." style="width: 100%; height: 46px; padding: 0 45px 0 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; box-sizing: border-box; outline: none;">
                            <button onclick="triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; background: var(--button-color); border: none; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    `;

                    buttonHTML = `
                        <button onclick="nextIntensityStep()" onmousedown="event.preventDefault()" class="btn-glass btn-glass-blue" style="width: 100%; height: 48px;">
                            Дальше ➡️
                        </button>
                    `;
                }

            chatContainer.innerHTML = `
                <div class="card" style="margin-top: 10px; text-align: left;">
                    
                    <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                    <div style="font-size: 18px; font-weight: 500; color: var(--text-color); margin-bottom: 15px; word-wrap: break-word; width: 100%;">
                        ${currentTask.translation}
                    </div>
                    
                    ${resultHTML}
                    ${buttonHTML}
                </div>
            `;
        } else {
            chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">❌ Ошибка: ${data.error}</div>`;
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">⚠️ Ошибка сети.</div>`;
    });
}

function nextIntensityStep() {
    intensityState.currentIndex++;
    loadNextIntensityTask(); // 🔥 Запрашиваем следующую фразу
}

// 5. ФИНАЛЬНЫЙ ЭКРАН
function showIntensityResult() {
    const chatContainer = document.getElementById('chat-messages');

    document.getElementById('text-input-row').style.display = 'none';

    chatContainer.innerHTML = `
        <div class="card" style="margin-top: 10px;">
            ${intensityLoaderHTML}
            <div style="font-size: 14px; color: var(--hint-color);">Считаем результаты и обновляем прогресс...</div>
        </div>
    `;

    apiFetch('/intensity/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            word: intensityState.word,
            score: intensityState.score
        })
    }).then(data => {
        let medal = "";
        let progressMsg = "";

        let oldPercent = 0;
        let newPercent = 0;
        const langCode = window.userProfile?.language || 'en';
        const pbTitle = langCode === 'de' ? 'Wortfortschritt' : 'Прогресс слова';

        if (window.userProfile) {
            const previousWords = window.userProfile.words_today || 0;
            const goal = window.userProfile.words_per_day || 5;

            oldPercent = Math.min(Math.round((previousWords / goal) * 100), 100);

            if (intensityState.score >= 3 && data.updated !== false) {
                const newWords = previousWords + 1;
                newPercent = Math.min(Math.round((newWords / goal) * 100), 100);
                window.userProfile.words_today = newWords;
            } else {
                newPercent = oldPercent;
            }
        }

        if (intensityState.score === 5) {
            medal = "🥇 Идеально! Истинный мастер контекста!";
            progressMsg = "🔥 <b>Слово успешно закреплено!</b><br><span style='font-size: 12px; color: var(--hint-color);'>Идет в зачет дневной нормы.</span>";
        } else if (intensityState.score >= 3) {
            medal = "🥈 Неплохо, но есть над чем поработать.";
            progressMsg = "🔥 <b>Слово засчитано!</b><br><span style='font-size: 12px; color: var(--hint-color);'>Но для идеала нужно 5 из 5.</span>";
        } else {
            medal = "🥉 Нужно повторить правила, ИИ заметил ошибки.";
            progressMsg = "🔄 <b>Процент не изменен</b><br><span style='font-size: 12px; color: var(--hint-color);'>Без штрафов, но стоит тренироваться чаще.</span>";
        }

        if (data.success && data.updated === false) {
            progressMsg = `
                <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-color);">
                    Слова <b>${intensityState.word}</b> ещё нет в твоём словаре.
                </div>
                <button onclick="goToTranslatorForWord('${intensityState.word.replace(/'/g, "\\'")}')" class="btn-glass btn-glass-green" style="width: 100%;">
                    ➕ Перевести и добавить
                </button>
            `;
            newPercent = oldPercent;
        }

        chatContainer.innerHTML = `
            <div class="card" style="margin-top: 10px;">
                
                <div style="font-size: 22px; font-weight: 500; color: var(--text-color); margin-bottom: 15px;">Интенсив завершен!</div>
                
                <div class="pb-main-container" style="flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-bottom: 15px; padding: 20px 15px; width: 100%; box-sizing: border-box;">
                    <div class="pb-avatar" style="margin: 0 auto 15px auto; width: 76px; height: 76px;">
                        <img src="frontend/img/mentor.jpg" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="pb-row" style="width: 100%;">
                        <div class="pb-header">
                            <span class="pb-title">${pbTitle}</span>
                            <span class="pb-value" id="intensity-pb-value">${oldPercent}%</span>
                        </div>
                        <div class="pb-track">
                            <div class="pb-fill" id="intensity-pb-fill" style="width: ${oldPercent}%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                    </div>
                </div>

                <div style="font-size: 15px; color: var(--text-color); margin-bottom: 5px;">Твой результат: <b>${intensityState.score} из 5</b></div>
                <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; line-height: 1.3;">${medal}</div>
                
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 14px; width: 100%; margin-bottom: 20px; box-sizing: border-box; line-height: 1.4;">
                    ${progressMsg}
                </div>
                
                <button onclick="exitToMainMenu()" class="btn-glass" style="width: 100%;">
                    Вернуться в меню
                </button>
           </div>
        `;

        if (newPercent > oldPercent) {
            setTimeout(() => {
                const bar = document.getElementById('intensity-pb-fill');
                if (bar) bar.style.width = `${newPercent}%`;

                const valueEl = document.getElementById('intensity-pb-value');
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

    }).catch(err => {
        chatContainer.innerHTML = `
            <div class="card" style="margin-top: 10px;">
                ⚠️ Результат не сохранен из-за ошибки сети.<br><br>
                <button onclick="exitToMainMenu()" class="btn-glass">В меню</button>
            </div>
        `;
    });
}

// 6. ФУНКЦИЯ ПОМОЩИ (ЕДИНСТВЕННАЯ СИНЯЯ КНОПКА "ДАЛЬШЕ" ПОСЛЕ ПОДСКАЗКИ)
// 6. ФУНКЦИЯ ПОМОЩИ (ЕДИНАЯ ЛОГИКА ШАГ 1 / ШАГ 2)
function showIntensityHelp() {
    intensityState.helpClicks = (intensityState.helpClicks || 0) + 1;
    let step = intensityState.helpClicks;
    const currentTask = intensityState.currentTask;

    if (step > 1) {
        document.getElementById('text-input-row').style.display = 'none';
    }
    window.showAiLoader("Ментор подбирает подсказку...");

    apiFetch('/intensity/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            original_phrase: currentTask.translation, // Русская
            reference_phrase: currentTask.phrase,     // Иностранная
            step: step,
            rule: currentTask.rule,
            target_word: intensityState.word
        })
    }).then(data => {
        if (window.currentAppMode !== 'intensity_active') return;

        if (data.success) {
            const chatContainer = document.getElementById('chat-messages');

            if (step === 1) {
                let buttons = `
                    <div style="display: flex; justify-content: center; gap: 10px; width: 100%;">
                        <button onclick="showIntensityHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1; background: rgba(255, 59, 48, 0.1); border-color: rgba(255, 59, 48, 0.3); color: #ff3b30;">Сдаюсь</button>
                        <button onclick="nextIntensityStep()" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Пропустить</button>
                    </div>
                `;
                chatContainer.innerHTML = `
                    <div class="card" style="margin-top: 10px; text-align: left;">
                        <div style="font-size: 20px; font-weight: 500; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word;">${currentTask.translation}</div>
                        
                        <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 12px; border-radius: 12px; text-align: left; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 14px; font-weight: bold; color: #ff9f0a; margin-bottom: 4px;">💡 Подсказка:</div>
                            <!-- 🔥 Ожидаем data.feedback, как в едином бэкенде -->
                            <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div> 
                        </div>

                        <div style="width: 100%; margin-top: 5px;">
                            ${buttons}
                        </div>
                    </div>
                `;
                document.getElementById('text-input-row').style.display = 'flex';
            } else {
                let btnNext = `<button onclick="nextIntensityStep()" onmousedown="event.preventDefault()" class="btn-glass btn-glass-blue" style="width: 100%; height: 46px;">Дальше ➡️</button>`;
                chatContainer.innerHTML = `
                    <div class="card" style="margin-top: 10px; text-align: left;">
                        <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Исходная фраза:</div>
                        <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; word-wrap: break-word;">${currentTask.translation}</div>
                        
                        <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 12px; border-radius: 10px; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
                            <div style="font-size: 14px; font-weight: bold; color: #34c759; margin-bottom: 4px;">📖 Правильный ответ:</div>
                            <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                        </div>
                        ${btnNext}
                    </div>
                `;
            }
        } else {
            const chatContainer = document.getElementById('chat-messages');
            chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">❌ Ошибка: ${data.error}</div>`;
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        const chatContainer = document.getElementById('chat-messages');
        chatContainer.innerHTML = `<div class="card" style="margin-top: 10px;">⚠️ Ошибка сети.</div>`;
        document.getElementById('text-input-row').style.display = 'flex';
    }).finally(() => {
        window.hideAiLoader();
    });
}

// ==========================================
// ПЕРЕХОД В ПЕРЕВОДЧИК ИЗ ИНТЕНСИВА
// ==========================================
function goToTranslatorForWord(word) {
    if (typeof exitToMainMenu === 'function') {
        exitToMainMenu();
    }

    const translatorInput = document.getElementById('quick-translator-input');
    if (translatorInput) {
        translatorInput.value = word;
    }

    if (typeof startQuickTranslation === 'function') {
        startQuickTranslation();
    }
}