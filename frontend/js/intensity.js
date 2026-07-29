// ==========================================
// ФАЙЛ: frontend/js/intensity.js
// ==========================================

let intensityState = {
    word: "",
    phrases: [],
    currentIndex: 0,
    score: 0,
    langName: "" // 'английский' или 'немецкий'
};

// 🔥 УНИВЕРСАЛЬНЫЙ HTML ДЛЯ АНИМИРОВАННОЙ ИКОНКИ ЗАГРУЗКИ
const intensityLoaderHTML = `
    <style>
        @keyframes pulseIntensitySmall {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    </style>
    <div style="display: flex; justify-content: center; align-items: center; width: 48px; height: 48px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; color: #34d399; animation: pulseIntensitySmall 2s infinite; margin-bottom: 12px;">
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
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 220px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.04); box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 1px 1px 0 rgba(255, 255, 255, 0.08), inset -1px -1px 0 rgba(0, 0, 0, 0.25); padding: 25px 20px; margin-top: 5px; text-align: center;">
            
            <div style="width: 56px; height: 56px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.1); color: #34d399;">
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 26H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M6 22L12 15L18 19L26 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 8H26V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>

            <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Режим Интенсива</div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 8px 14px; border-radius: 10px; margin-bottom: 12px; font-size: 13px; color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.04);">
                Тренируем: <b>${langName} ${langFlag}</b> &nbsp;|&nbsp; Уровень: <b>${difficulty}</b>
            </div>

            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); line-height: 1.4;">
                Напиши любое слово на <b>${langPrepositional}</b> языке. ИИ придумает с ним 5 предложений твоего уровня сложности!
            </div>
        </div>
    `;
    userInput.focus();
}

// 2. ЗАПУСК ГЕНЕРАЦИИ (ПОДДЕРЖИВАЕТ ЗНАЧЕНИЯ ИЗ СЛОВАРЯ И РУЧНОЙ ВВОД)
function startIntensity(word, meanings = []) {
    intensityState.word = word.trim();
    if (!intensityState.word) return;

    const langCode = window.userProfile?.language || 'en';
    const chatContainer = document.getElementById('chat-messages');

    const isEnglishOnly = /^[a-zA-Z\s\-']+$/.test(intensityState.word);
    const isGermanOnly = /^[a-zA-ZäöüÄÖÜß\s\-']+$/.test(intensityState.word);

    if ((langCode === 'en' && !isEnglishOnly) || (langCode === 'de' && !isGermanOnly)) {
        document.getElementById('text-input-row').style.display = 'none';
        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 14px; padding: 20px; margin-top: 10px; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 15px; color: #ff3b30; font-weight: bold;">Упс! Неверная раскладка.</div>
                <div style="font-size: 13px; color: var(--hint-color); margin-top: 8px;">Пожалуйста, введи слово на ${langCode === 'en' ? 'английском' : 'немецком'} языке.</div>
            </div>
        `;
        setTimeout(showIntensitySetupMode, 2500);
        return;
    }

    intensityState.score = 0;
    intensityState.currentIndex = 0;
    intensityState.langName = langCode === 'de' ? 'немецкий' : 'английский';

    const difficulty = window.userProfile?.difficulty || 'A1';
    window.currentAppMode = 'intensity_active';
    document.getElementById('text-input-row').style.display = 'none';

    let loadingText = meanings.length > 0
        ? `ИИ генерирует 5 фраз со словом <b>${intensityState.word}</b>,<br>используя разные его значения...`
        : `ИИ генерирует 5 фраз со словом <b>${intensityState.word}</b>...`;

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; text-align: center;">
            ${intensityLoaderHTML}
            <div style="font-size: 14px; color: var(--hint-color); line-height: 1.4;">${loadingText}</div>
        </div>
    `;

   apiFetch('/intensity/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            word: intensityState.word,
            difficulty: difficulty,
            meanings: meanings
        })
    }).then(data => {
        // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard();
        }

        if (data.success) {
            intensityState.phrases = data.phrases;
            showNextIntensityPhrase();
        } else {
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">❌ Ошибка: ${data.error}</div>`;
            document.getElementById('text-input-row').style.display = 'flex';
            window.currentAppMode = 'intensity_setup';
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети.</div>`;
        document.getElementById('text-input-row').style.display = 'flex';
        window.currentAppMode = 'intensity_setup';
    });
}

// 3. ПОКАЗ ОЧЕРЕДНОЙ ФРАЗЫ (КОМПАКТНАЯ КАРТОЧКА)
function showNextIntensityPhrase() {
    if (intensityState.currentIndex >= 5) {
        showIntensityResult();
        return;
    }

    const currentTask = intensityState.phrases[intensityState.currentIndex];
    const chatContainer = document.getElementById('chat-messages');

    document.getElementById('text-input-row').style.display = 'flex';
    const userInput = document.getElementById('user-input');
    userInput.value = '';
    userInput.placeholder = "Перевод...";
    userInput.focus();

    const langCode = window.userProfile?.language || 'en';
    const langName = langCode === 'de' ? 'немецкий' : 'английский';
    const langFlag = langCode === 'de' ? '🇩🇪' : '🇬🇧';

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 12px 15px; margin-top: 10px; width: 100%; box-sizing: border-box;">
            
            <!-- Шапка: Иконка и Прогресс -->
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                <div style="display: flex; justify-content: center; align-items: center; width: 28px; height: 28px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; color: #34d399;">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 26H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                        <path d="M6 22L12 15L18 19L26 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 8H26V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div style="font-size: 11px; font-weight: bold; color: var(--text-color); background: rgba(112, 132, 153, 0.15); padding: 5px 10px; border-radius: 8px; text-transform: uppercase;">
                    Фраза ${intensityState.currentIndex + 1} / 5
                </div>
            </div>

            <!-- Задание -->
            <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; width: 100%; text-align: left;">
                Переведи на ${langName} ${langFlag}:
            </div>

            <div style="font-size: 17px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; width: 100%; text-align: left; line-height: 1.2;">
                ${currentTask.translation}
            </div>

            <div style="font-size: 13px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--button-color); text-align: left; width: 100%; box-sizing: border-box;">
                <b>⚙️ Условие:</b> ${currentTask.rule}
            </div>
            
            <button onclick="showIntensityHelp()" style="width: 100%; margin-top: 12px; padding: 10px; background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: 8px; color: #ff9f0a; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;">
                💡 Не знаю (показать ответ)
            </button>
        </div>
    `;
}

// 4. ПРОВЕРКА ОТВЕТА (КОМПАКТНО)
// 4. ПРОВЕРКА ОТВЕТА (КОМПАКТНО)
function handleIntensityInput(text) {
    const currentTask = intensityState.phrases[intensityState.currentIndex];

    document.getElementById('text-input-row').style.display = 'none';
    const chatContainer = document.getElementById('chat-messages');

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; text-align: center;">
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
            user_answer: text
        })
    }).then(data => {
        // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard();
        }

        if (data.success) {
            let resultHTML = '';

            if (data.is_correct) {
                intensityState.score++;

                // 🔥 МГНОВЕННОЕ ОБНОВЛЕНИЕ ПРОГРЕСС-БАРА ФРАЗ
                if (window.userProfile) {
                    window.userProfile.phrases_today = (window.userProfile.phrases_today || 0) + 1;
                    if (typeof initProgressBars === 'function') {
                        initProgressBars();
                    }
                }

                resultHTML = `
                    <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">✅ Верно:</div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 12px; border-radius: 10px; border-left: 3px solid #34c759; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
                        <div style="font-size: 14px; color: var(--text-color);">${data.feedback}</div>
                    </div>
                `;
            } else {
                resultHTML = `
                    <div style="font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">❌ Ошибка:</div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 12px; border-radius: 10px; border-left: 3px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 15px;">
                        <div style="font-size: 14px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `;
            }

            // Отрисовываем карточку с результатом и кнопкой перехода
            chatContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; width: 100%; box-sizing: border-box; text-align: left;">
                    
                    <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-color); margin-bottom: 15px; word-wrap: break-word; width: 100%;">
                        ${currentTask.translation}
                    </div>
                    
                    ${resultHTML}

                    <button onclick="nextIntensityStep()" class="btn-glass btn-glass-blue" style="width: 100%; height: 46px;">
                        Дальше ➡️
                    </button>
                </div>
            `;

        } else {
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">❌ Ошибка: ${data.error}</div>`;
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети.</div>`;
    });
}

function nextIntensityStep() {
    intensityState.currentIndex++;
    showNextIntensityPhrase();
}

// 5. ФИНАЛЬНЫЙ ЭКРАН
function showIntensityResult() {
    const chatContainer = document.getElementById('chat-messages');
    document.getElementById('text-input-row').style.display = 'none';

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; text-align: center;">
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

        if (intensityState.score === 5) {
            medal = "🥇 Идеально! Истинный мастер контекста!";
            progressMsg = "🔥 <b>+20% к выученности</b><br><span style='font-size: 12px; color: var(--hint-color);'>Бонус к сроку следующего повторения!</span>";
        } else if (intensityState.score >= 3) {
            medal = "🥈 Неплохо, но есть над чем поработать.";
            progressMsg = "🔄 <b>Процент не изменен</b><br><span style='font-size: 12px; color: var(--hint-color);'>Штрафов нет! Для повышения нужно 5 из 5.</span>";
        } else {
            medal = "🥉 Нужно повторить правила, ИИ заметил ошибки.";
            progressMsg = "🔄 <b>Процент не изменен</b><br><span style='font-size: 12px; color: var(--hint-color);'>Без штрафов, но стоит тренироваться чаще.</span>";
        }

        if (data.success && data.updated === false) {
            progressMsg = "<i>(Слово не из словаря, прогресс не записан)</i>";
        }

        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px 15px; margin-top: 10px; text-align: center;">
                <div style="font-size: 50px; margin-bottom: 10px;">🏆</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Интенсив завершен!</div>
                <div style="font-size: 15px; color: var(--text-color); margin-bottom: 5px;">Твой результат: <b>${intensityState.score} из 5</b></div>
                <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; line-height: 1.3;">${medal}</div>
                
                <div style="background: rgba(112, 132, 153, 0.1); border-radius: 10px; padding: 12px; width: 100%; margin-bottom: 20px; box-sizing: border-box; line-height: 1.4;">
                    ${progressMsg}
                </div>
                
                <button onclick="exitToMainMenu()" style="width: 100%; padding: 12px; background: var(--button-color); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;">
                    Вернуться в меню
                </button>
            </div>
        `;
    }).catch(err => {
        chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Результат не сохранен из-за ошибки сети.</div>
        <button onclick="exitToMainMenu()" style="width: 100%; padding: 12px; background: var(--button-color); border: none; border-radius: 10px; color: #fff;">В меню</button>`;
    });
}

// 6. ФУНКЦИЯ ПОМОЩИ (СДАЧИ) - КОМПАКТНО
// 6. ФУНКЦИЯ ПОМОЩИ (СДАЧИ) - КОМПАКТНО
function showIntensityHelp() {
    const currentTask = intensityState.phrases[intensityState.currentIndex];

    document.getElementById('text-input-row').style.display = 'none';
    const chatContainer = document.getElementById('chat-messages');

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; text-align: center;">
            ${intensityLoaderHTML}
            <div style="font-size: 14px; color: var(--hint-color);">ИИ готовит разбор грамматики...</div>
        </div>
    `;

    apiFetch('/intensity/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            russian_phrase: currentTask.translation,
            foreign_phrase: currentTask.phrase
        })
    }).then(data => {
        // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard();
        }

        if (data.success) {
            // 🔥 Рендерим полученный ответ и кнопку перехода к следующей фразе
            chatContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 14px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 15px; margin-top: 10px; width: 100%; box-sizing: border-box; text-align: left;">
                    
                    <div style="font-size: 11px; color: #ff9f0a; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">💡 Правильный ответ:</div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; background: rgba(255, 159, 10, 0.1); padding: 10px 12px; border-radius: 10px; border-left: 3px solid #ff9f0a; word-wrap: break-word; width: 100%; box-sizing: border-box;">
                        ${currentTask.phrase}
                    </div>

                    <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Разбор:</div>
                    <div style="font-size: 13px; color: var(--text-color); line-height: 1.4; margin-bottom: 15px; background: rgba(112, 132, 153, 0.1); padding: 10px 12px; border-radius: 10px; width: 100%; box-sizing: border-box;">
                        ${data.explanation}
                    </div>

                    <button onclick="nextIntensityStep()" style="width: 100%; padding: 12px; background: var(--button-color); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;">
                        Дальше ➡️
                    </button>
                </div>
            `;
        } else {
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">❌ Ошибка: ${data.error}</div>`;
        }
    }).catch(err => {
        if (window.isRateLimitError(err)) return window.showLimitCard();
        chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети.</div>`;
    });
}