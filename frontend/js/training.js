// ==========================================
// ФАЙЛ: frontend/js/training.js
// ==========================================

let trainingState = {
    activeRound: [],
    nextRound: [],
    currentIndex: 0,
    swapped: true,
    totalWords: 0,
    completedWords: 0,
    source: 'user',
    pos: 'mix',
    mode: 'new',
    targetCount: 0,
    pendingBackgroundWords: 0 // 🔥 Новый счетчик для фоновых загрузок
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 🔥 ГЛАВНОЕ МЕНЮ ТРЕНИРОВКИ
function showTrainingMenu() {
    window.currentAppMode = 'training';
    setAppHeader('Тренировки', true);

    const dictName = (window.userProfile && window.userProfile.language === 'de') ? 'Гёте' : 'Oxford';

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    document.getElementById('chat-messages').innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 25px; width: 100%; margin-top: 10px; padding-bottom: 30px;">
            
            <!-- РАЗДЕЛ 1: МОЙ СЛОВАРЬ (3 карточки) -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-left: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
                    Мой словарь
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="menu-card" style="padding: 10px 5px;" onclick="showQuantitySelector('user', 'mix', 'new')">
                        <div class="convex-icon icon-purple-1">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                        </div>
                        <div class="menu-title" style="font-size: 10px;">Новые</div>
                    </div>

                    <div class="menu-card" style="padding: 10px 5px;" onclick="startTraining(999, 'user', 'mix', 'review')">
                        <div class="convex-icon icon-purple-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                        </div>
                        <div class="menu-title" style="font-size: 10px;">Повторить</div>
                    </div>

                    <div class="menu-card" style="padding: 10px 5px;" onclick="showFullDictionary()">
                        <div class="convex-icon icon-purple-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div class="menu-title" style="font-size: 10px;">Выбрать</div>
                    </div>
                </div>
            </div>

            <!-- РАЗДЕЛ 2: ГЛОБАЛЬНЫЙ СЛОВАРЬ -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-left: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
                Глобальные базы
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div class="menu-card" style="padding: 10px 5px;" onclick="showQuantitySelector('oxford', 'mix', 'new')">
                    <div class="convex-icon icon-yellow-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    </div>
                    <div class="menu-title" style="font-size: 10px;">${dictName}</div>
                </div>

                <!-- 🔥 НОВАЯ КАРТОЧКА: ФРАЗОВЫЕ ГЛАГОЛЫ -->
                <div class="menu-card" style="padding: 10px 5px;" onclick="showQuantitySelector('phrasal', 'mix', 'new')">
                    <div class="convex-icon icon-yellow-1" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2-9 5 18 2-9h4"></path></svg>
                    </div>
                    <div class="menu-title" style="font-size: 10px;">Фразовые</div>
                </div>
            </div>
        </div>

        </div>
    `;
}

// 🔥 ОКНО ВЫБОРА КОЛИЧЕСТВА
function showQuantitySelector(source, pos, mode = 'new') {
    const dictName = (window.userProfile && window.userProfile.language === 'de') ? 'Гёте' : 'Oxford';

    let title = `Словарь ${dictName}`;
    let subtitle = 'Сколько слов берем для тренировки?';

    if (source === 'user') {
        if (mode === 'new') {
            title = 'Новые слова';
            subtitle = 'Сколько абсолютно новых слов изучим?';
        } else if (mode === 'review') {
            title = 'Интервальное повторение';
            subtitle = 'Сколько слов из просроченных повторим?';
        }
    } else if (source === 'oxford') {
        title = `Исследование ${dictName}`;
        subtitle = 'Сколько новых слов откроем?';
    } else if (source === 'phrasal') {
        title = `Фразовые глаголы`;
        subtitle = 'Сколько глаголов будем учить?';
    }

    document.getElementById('chat-messages').innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(35, 48, 65, 0.9) 0%, rgba(10, 15, 22, 0.98) 100%); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 25px 20px; margin-top: 5px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 18px; color: var(--text-color); margin-bottom: 8px;">${title}</div>
            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-bottom: 25px;">${subtitle}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
                <button onclick="startTraining(3, '${source}', '${pos}', '${mode}')" class="btn-glass" style="height: 48px;">3 слова</button>
                <button onclick="startTraining(5, '${source}', '${pos}', '${mode}')" class="btn-glass" style="height: 48px;">5 слов</button>
                <button onclick="startTraining(8, '${source}', '${pos}', '${mode}')" class="btn-glass" style="height: 48px;">8 слов</button>
                <button onclick="startTraining(10, '${source}', '${pos}', '${mode}')" class="btn-glass" style="height: 48px;">10 слов</button>
            </div>

            <button onclick="showTrainingMenu()" class="btn-glass-neutral" style="margin-top: 20px; width: 100%; height: 46px; border-radius: 14px; font-size: 14px;">
                Назад
            </button>
        </div>
    `;
}

// 🔥 ЗАПУСК ТРЕНИРОВКИ С АСИНХРОННОЙ ПОДГРУЗКОЙ ИИ
// 🔥 ЗАПУСК ТРЕНИРОВКИ С АСИНХРОННОЙ ПОДГРУЗКОЙ ИИ
// 🔥 ЗАПУСК ТРЕНИРОВКИ С АСИНХРОННОЙ ПОДГРУЗКОЙ ИИ
function startTraining(count, source = 'user', pos = 'mix', mode = 'new') {
    trainingState.source = source;
    trainingState.pos = pos;
    trainingState.mode = mode;
    trainingState.targetCount = count;
    trainingState.pendingBackgroundWords = 0; // Сбрасываем счетчик

    const dictName = (window.userProfile && window.userProfile.language === 'de') ? 'Гёте' : 'Oxford';

    let headerTitle = "Тренировка";
    if (mode === 'new') headerTitle = "Новые слова";
    else if (mode === 'review') headerTitle = "Повторение";
    else if (mode === 'specific') headerTitle = "Выбранные слова";

    // 🔥 ИСПРАВЛЕНИЕ: Теперь мы используем переменную dictName
    if (source === 'oxford') headerTitle = `Исследование ${dictName}`;
    if (source === 'phrasal') headerTitle = `Фразовые глаголы`;

    setAppHeader(headerTitle, true);

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);"><i>⏳ Формируем подборку...</i></div>';

    // 🌟 ХИТРОСТЬ: Для Оксфорда/Гёте мы грузим сначала только 1 слово, чтобы мгновенно показать интерфейс
    let initialCount = ((source === 'oxford' || source === 'phrasal') && count > 1) ? 1 : count;
    let backgroundCount = ((source === 'oxford' || source === 'phrasal') && count > 1) ? count - 1 : 0;

    const timestamp = new Date().getTime();
    const apiUrl = `/train/start?chat_id=${user.id}&count=${initialCount}&source=${source}&pos=${pos}&mode=${mode}&_t=${timestamp}`;

    apiFetch(apiUrl)
        .then(data => {
            if (window.currentAppMode !== 'training') return;

            if (data.success && data.words && data.words.length > 0) {
                // Если не Оксфорд, показываем поле ввода
                if (source !== 'oxford' && source !== 'phrasal') {
                    const inputContainer = document.getElementById('input-container');
                    if (inputContainer) inputContainer.style.display = 'flex';
                    const inputEl = document.getElementById('user-input');
                    if (inputEl) {
                        inputEl.placeholder = "Перевод...";
                        setTimeout(() => inputEl.focus(), 10);
                    }
                }

                trainingState.activeRound = shuffleArray(data.words.map(w => ({
                    ...w, correctGuesses: 0, hintShown: false, hidden: false, selectedForAdd: false
                })));

                trainingState.nextRound = [];
                trainingState.currentIndex = 0;
                trainingState.totalWords = data.words.length;
                trainingState.completedWords = 0;

                // Сначала добавляем фоновые слова в счетчик!
                if (backgroundCount > 0) {
                    trainingState.pendingBackgroundWords += backgroundCount;
                }

                // Рисуем карточку
                showCurrentWord();

                // 🌟 ЗАПУСК ФОНОВОГО ЗАПРОСА
                if (backgroundCount > 0) {
                    const bgUrl = `/train/start?chat_id=${user.id}&count=${backgroundCount}&source=${source}&pos=${pos}&mode=${mode}&_t=${new Date().getTime()}`;

                    apiFetch(bgUrl).then(bgData => {
                        if (window.currentAppMode !== 'training') return;
                        if (bgData.success && bgData.words && bgData.words.length > 0) {
                            const newWords = bgData.words.map(w => ({
                                ...w, correctGuesses: 0, hintShown: false, hidden: false, selectedForAdd: false
                            }));
                            trainingState.activeRound.push(...newWords);
                        }

                        trainingState.pendingBackgroundWords -= backgroundCount;

                        if (trainingState.currentIndex >= trainingState.activeRound.length - bgData.words.length) {
                            showCurrentWord();
                        }
                    }).catch(() => {
                        trainingState.pendingBackgroundWords -= backgroundCount;
                        if (trainingState.currentIndex >= trainingState.activeRound.length) showCurrentWord();
                    });
                }

            } else {
                // Логика пустой тренировки
                const inputContainer = document.getElementById('input-container');
                if (inputContainer) inputContainer.style.display = 'none';

                let titleMsg = mode === 'new' ? 'Новых слов пока нет' : 'Повторять пока нечего';
                let descMsg = mode === 'new' ? 'Давай выберем конкретные слова для тренировки!' : 'Все слова свежи в памяти. Давай потренируем конкретные слова!';

                if (source === 'oxford') {
                    titleMsg = 'Слова закончились';
                    descMsg = 'Похоже, ты исследовал все доступные слова в этом разделе!';
                }

                chatContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(35, 48, 65, 0.9) 0%, rgba(10, 15, 22, 0.98) 100%); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 30px 20px; margin-top: 5px; text-align: center;">
                        <div style="font-size: 40px; margin-bottom: 15px;">📭</div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 8px;">${titleMsg}</div>
                        <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 25px;">${descMsg}</div>
                        
                        <button onclick="showFullDictionary()" class="btn-glass" style="height: 48px; border-color: rgba(168, 129, 243, 0.4); color: #c4aff3; margin-bottom: 12px; width: 100%;">
                            Выбрать из словаря
                        </button>
                        <button onclick="showTrainingMenu()" class="btn-glass-neutral" style="height: 48px; width: 100%; border-radius: 14px;">
                            Назад в меню
                        </button>
                    </div>
                `;
            }
        })
        .catch(err => {
            if (window.currentAppMode !== 'training') return;
            document.getElementById('input-container').style.display = 'none';
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети при загрузке.</div>`;
        });
}

// 🔥 МОМЕНТАЛЬНОЕ УДАЛЕНИЕ СЛОВА И ФОНОВАЯ ЗАМЕНА
function markWordAsKnown(wordId, wordText) {
    // В Оксфорде удаляем без подтверждения для скорости Тиндера
    if (trainingState.source !== 'oxford' && trainingState.source !== 'phrasal') {
        if (!confirm(`Отметить слово "${wordText}" как выученное? Оно больше не появится в этих тренировках.`)) return;
    }

    const inputEl = document.getElementById('user-input');
    if (inputEl) inputEl.blur();

    if (trainingState.activeRound[trainingState.currentIndex]) {
        trainingState.activeRound[trainingState.currentIndex].hidden = true;
    }

    // 🌟 СРАЗУ ИДЕМ ДАЛЬШЕ
    trainingState.currentIndex++;

    if (trainingState.source === 'oxford' || trainingState.source === 'phrasal') {
        trainingState.pendingBackgroundWords++; // Ждем 1 фоновое слово на замену
    } else {
        trainingState.totalWords--; // В обычном словаре просто убавляем счетчик
    }

    showCurrentWord(); // Мгновенно показываем следующее слово

    // Фоновый запрос на отметку и замену
    apiFetch('/train/mark_known', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, word_id: wordId, word_foreign: wordText, source: trainingState.source })
    }).then(data => {
        if (data.success && trainingState.source === 'oxford') {
            const timestamp = new Date().getTime();
            apiFetch(`/train/start?chat_id=${user.id}&count=1&source=${trainingState.source}&pos=${trainingState.pos}&mode=${trainingState.mode}&_t=${timestamp}`)
                .then(res => {
                    if (res.success && res.words && res.words.length > 0) {
                        const newWord = { ...res.words[0], correctGuesses: 0, hintShown: false, hidden: false, selectedForAdd: false };
                        trainingState.activeRound.push(newWord);
                    }
                    trainingState.pendingBackgroundWords--;

                    // Перерисовка, если юзер застрял на экране загрузки
                    if (trainingState.currentIndex >= trainingState.activeRound.length - 1) {
                        showCurrentWord();
                    }
                })
                .catch(() => {
                    trainingState.pendingBackgroundWords--;
                    if (trainingState.currentIndex >= trainingState.activeRound.length) showCurrentWord();
                });
        }
    }).catch(err => {
        console.error(err);
        if (trainingState.source === 'oxford') trainingState.pendingBackgroundWords--;
    });
}

function toggleSwap() {
    trainingState.swapped = !trainingState.swapped;
    if (trainingState.activeRound.length > 0 && trainingState.currentIndex < trainingState.activeRound.length) {
        showCurrentWord();
    }
}

// 🔥 КАРТОЧКА СЛОВА
function showCurrentWord() {
    const chatContainer = document.getElementById('chat-messages');
    const dictName = (window.userProfile && window.userProfile.language === 'de') ? 'Гёте' : 'Oxford';
    setAppHeader(trainingState.source === 'oxford' ? `Исследование ${dictName}` : "Тренировка", true);

    // 🌟 ЕСЛИ СЛОВА ЗАКОНЧИЛИСЬ, НО ЕЩЕ ИДЕТ ФОНОВАЯ ЗАГРУЗКА ИИ
    if (trainingState.currentIndex >= trainingState.activeRound.length && trainingState.pendingBackgroundWords > 0) {
        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); margin-top: 15px;">
                <div style="font-size: 36px; margin-bottom: 15px; animation: pulse 1.5s infinite;">🧠</div>
                <div style="font-size: 15px; font-weight: 500; color: var(--text-color);">ИИ переводит слова...</div>
            </div>
        `;
        return; // Ждем фонового промиса
    }

    // ===============================================
    // ЭКРАН ЗАВЕРШЕНИЯ ТРЕНИРОВКИ / ОКСФОРДА
    // ===============================================
    if (trainingState.currentIndex >= trainingState.activeRound.length) {
        if (trainingState.nextRound.length === 0) {

            // 🌟 ФИНАЛЬНЫЙ ЭКРАН ДЛЯ OXFORD (Саммари слов)
            if (trainingState.source === 'oxford' || trainingState.source === 'phrasal') {
                let summaryHtml = '';
                let hasVisibleWords = false;

                trainingState.activeRound.forEach((w, idx) => {
                    if (!w.hidden) {
                        hasVisibleWords = true;
                        summaryHtml += `
                            <div id="oxford-summary-item-${idx}" onclick="toggleOxfordSelection(${idx})" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 12px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;">
                                <div style="display: flex; flex-direction: column; text-align: left;">
                                    <span style="font-size: 16px; font-weight: bold; color: #fff;">${w.foreign}</span>
                                    <span style="font-size: 13px; color: rgba(255,255,255,0.6);">${w.ru}</span>
                                </div>
                                <div id="oxford-summary-icon-${idx}" style="font-size: 20px; color: rgba(255,255,255,0.3);">
                                    ➕
                                </div>
                            </div>
                        `;
                    }
                });

                chatContainer.innerHTML = `
                    <div class="pb-main-container" style="flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; margin-top: 15px; padding: 25px 20px; min-height: 400px;">
                        <div style="font-size: 22px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">Отличная работа! 🎉</div>
                        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin-bottom: 20px;">Отметь слова, которые хочешь добавить в свой словарь:</div>
                        
                        <div style="width: 100%; max-height: 300px; overflow-y: auto; margin-bottom: 20px; padding-right: 5px;">
                            ${hasVisibleWords ? summaryHtml : '<div style="color: rgba(255,255,255,0.5); font-size: 14px;">Нет слов для добавления</div>'}
                        </div>

                        <button onclick="saveSelectedOxfordWords()" class="btn-glass btn-glass-green" style="width: 100%; height: 48px; margin-bottom: 10px; border-radius: 14px;">
                            Сохранить выбранные
                        </button>
                        <button onclick="exitToMainMenu()" class="btn-glass-neutral" style="width: 100%; height: 46px; border-radius: 14px;">
                            Пропустить
                        </button>
                    </div>
                `;
                document.getElementById('input-container').style.display = 'none';
                return;
            }

       // 🌟 ФИНАЛЬНЫЙ ЭКРАН ДЛЯ ОБЫЧНЫХ ТРЕНИРОВОК (С 3D ментором)
            let oldPercent = 0;
            let newPercent = 0;
            let pbTitle = '';
            let statText = '';
            let barBackground = '';

            // 🔥 ОПРЕДЕЛЯЕМ, ЧТО ИМЕННО МЫ АНИМИРУЕМ
            if (trainingState.mode === 'review') {
                // Анимируем микро-бар повторений
                pbTitle = 'Интервальное повторение';
                barBackground = 'linear-gradient(90deg, #40445d, #34c759)'; // Стиль под микро-бар

                const prevReview = window.userProfile ? (window.userProfile.review_count !== undefined ? window.userProfile.review_count : 0) : 0;
                const newReview = Math.max(0, prevReview - trainingState.totalWords);

                if (window.userProfile) {
                    window.userProfile.review_count = newReview;
                    window.userProfile.review_words_count = newReview; // Для обратной совместимости
                }

                // 10 слов = 0%, 0 слов = 100%
                oldPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(prevReview, 10) / 10) * 100)));
                newPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(newReview, 10) / 10) * 100)));
                statText = `-${trainingState.totalWords} слов из долга`;

            } else if (trainingState.source === 'phrasal') {
                // Анимируем нижний бар (фразы)
                pbTitle = 'Тренировка фраз';
                barBackground = 'linear-gradient(90deg, #755C93, #d8b4fe)'; // Фиолетовый стиль из CSS

                const prevPhrases = window.userProfile ? (window.userProfile.phrases_today || 0) : 0;
                const phrasesGoal = window.userProfile?.phrases_per_day || 10;
                const newPhrases = prevPhrases + trainingState.totalWords;

                if (window.userProfile) window.userProfile.phrases_today = newPhrases;

                oldPercent = phrasesGoal > 0 ? Math.min(Math.round((prevPhrases / phrasesGoal) * 100), 100) : 0;
                newPercent = phrasesGoal > 0 ? Math.min(Math.round((newPhrases / phrasesGoal) * 100), 100) : 0;
                statText = `+${trainingState.totalWords} фраз пройдено`;

            } else {
                // Анимируем верхний бар (новые слова)
                pbTitle = (window.userProfile && window.userProfile.language === 'de') ? 'Wortschatz lernen' : 'Изучение слов';
                barBackground = 'linear-gradient(90deg, #d4b595, #f5d6b8)'; // Золотой стиль из CSS

                const prevWords = window.userProfile ? (window.userProfile.words_today || 0) : 0;
                const wordsGoal = window.userProfile?.words_per_day || 5;
                const newWords = prevWords + trainingState.totalWords;

                if (window.userProfile) window.userProfile.words_today = newWords;

                oldPercent = wordsGoal > 0 ? Math.min(Math.round((prevWords / wordsGoal) * 100), 100) : 0;
                newPercent = wordsGoal > 0 ? Math.min(Math.round((newWords / wordsGoal) * 100), 100) : 0;
                statText = `+${trainingState.totalWords} слов изучено`;
            }

// Отправляем статистику на сервер
            apiFetch('/train/finish', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({chat_id: user.id, count: trainingState.totalWords})
            });

            // 🔥 Финальный экран с аватаркой ментора (как в tasks.js)
            chatContainer.innerHTML = `
                <div class="pb-main-container" style="flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-top: 15px; padding: 30px 20px;">
                    
                    <div class="pb-avatar" style="margin: 0 auto 20px auto; width: 110px; height: 110px;">
                        <img src="frontend/img/mentor.jpg" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <div style="font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">Поздравляем!</div>
                    <div style="font-size: 15px; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-bottom: 25px;">Сессия завершена</div>
                    
                    <div class="pb-row" style="width: 100%;">
                        <div class="pb-header">
                            <span class="pb-title">${pbTitle}</span>
                            <span class="pb-value" id="final-pb-value">${oldPercent}%</span>
                        </div>
                        <div class="pb-track">
                            <div class="pb-fill" id="final-pb-fill" style="width: ${oldPercent}%; background: ${barBackground}; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #34d399; margin-top: 20px; font-weight: 600;">${statText}</div>
                    
                    <button onclick="exitToMainMenu()" class="btn-glass" style="margin-top: 25px; width: 100%; height: 46px; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                        Завершить
                    </button>
                </div>`;

            document.getElementById('input-container').style.display = 'none';

            // 🔥 Оставляем ТОЛЬКО анимацию загрузки прогресс-бара
            setTimeout(() => {
                const bar = document.getElementById('final-pb-fill');
                if (bar) bar.style.width = `${newPercent}%`;
                const valueEl = document.getElementById('final-pb-value');
                const duration = 1200;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    const currentVal = Math.round(oldPercent + (newPercent - oldPercent) * easeProgress);
                    if (valueEl) valueEl.innerText = `${currentVal}%`;
                    if (progress < 1) requestAnimationFrame(updateCounter);
                }

                requestAnimationFrame(updateCounter);
            }, 100);
            return;
        } else {


            trainingState.activeRound = shuffleArray([...trainingState.nextRound.map(w => ({...w, hintShown: false}))]);
            trainingState.nextRound = [];
            trainingState.currentIndex = 0;
        }
    }

    const wordObj = trainingState.activeRound[trainingState.currentIndex];
    const escapedForeign = wordObj.foreign.replace(/'/g, "\\'");
    const escapedRu = wordObj.ru ? wordObj.ru.replace(/'/g, "\\'") : '';

    // 🔥 Идеальный точный подсчет оставшихся карточек (видимые + фоновые загрузки)
    const remainingCards = (trainingState.activeRound.length - trainingState.currentIndex) + trainingState.pendingBackgroundWords;

    // ===============================================
    // 🔥 РЕЖИМ ОВКСФОРДА (КНОПКА ТОЛЬКО СКРЫТЬ)
    // ===============================================
    if (trainingState.source === 'oxford') {
        document.getElementById('input-container').style.display = 'none';

        let optionsHtml = '';
        if (wordObj.options && wordObj.options.length === 3) {
            wordObj.options.forEach((opt, idx) => {
                const isCorrect = opt === wordObj.ru;
                optionsHtml += `
                    <button id="quiz-btn-${idx}" onclick="handleOxfordAnswer(${idx}, ${isCorrect})" class="btn-glass" style="width: 100%; min-height: 48px; margin-bottom: 8px; font-size: 16px; white-space: normal; height: auto; padding: 10px; transition: all 0.2s;">
                        ${opt}
                    </button>
                `;
            });
        }

        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; position: relative; box-sizing: border-box; width: 100%;">
                    
                    <!-- ЛЕВАЯ КНОПКА: Скрыть (Мусорка) -->
                    <div style="position: absolute; top: 12px; left: 12px; z-index: 10;">
                        <button onclick="markWordAsKnown(${wordObj.id}, '${escapedForeign}')" class="btn-glass" style="width: 36px; height: 36px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; border-color: rgba(255, 59, 48, 0.4); color: #ff3b30; background: rgba(255, 59, 48, 0.1);" title="Удалить из словаря">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>

                    <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 20px;">
                        Осталось карточек: <span style="color: var(--text-color);">${remainingCards}</span>
                    </div>

                    <div style="font-size: 32px; font-weight: bold; color: var(--text-color); text-align: center; margin-bottom: 30px; word-wrap: break-word; width: 100%;">
                        ${wordObj.foreign}
                    </div>
                    
                    <div style="width: 100%; display: flex; flex-direction: column;">
                        ${optionsHtml}
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // ===============================================
    // 🔥 РЕЖИМ ФРАЗОВЫХ ГЛАГОЛОВ
    // ===============================================
    if (trainingState.source === 'phrasal') {
        document.getElementById('input-container').style.display = 'none';

        let optionsHtml = '';
        if (wordObj.options && wordObj.options.length === 3) {
            wordObj.options.forEach((opt, idx) => {
                // Для фразовых глаголов правильный ответ - английское слово
                const isCorrect = (opt === wordObj.foreign);

                optionsHtml += `
                    <button id="quiz-btn-${idx}" onclick="handleOxfordAnswer(${idx}, ${isCorrect})" class="btn-glass" style="width: 100%; min-height: 48px; margin-bottom: 8px; font-size: 18px; padding: 12px; transition: all 0.2s;">
                        ${opt}
                    </button>
                `;
            });
        }

        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; position: relative; box-sizing: border-box; width: 100%;">
                    
                    <div style="position: absolute; top: 12px; left: 12px; z-index: 10;">
                        <button onclick="markWordAsKnown(${wordObj.id}, '${escapedForeign}')" class="btn-glass" style="width: 36px; height: 36px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; border-color: rgba(255, 59, 48, 0.4); color: #ff3b30; background: rgba(255, 59, 48, 0.1);" title="Удалить из словаря">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>

                    <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 20px;">
                        Осталось карточек: <span style="color: var(--text-color);">${remainingCards}</span>
                    </div>

                    <div style="font-size: 30px; font-weight: bold; color: var(--text-color); text-align: center; margin-bottom: 30px; word-wrap: break-word; width: 100%;">
                        ${wordObj.ru}
                    </div>
                    
                    <div style="width: 100%; display: flex; flex-direction: column;">
                        ${optionsHtml}
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // ===============================================
    // 🔥 СТАНДАРТНЫЙ РЕЖИМ (ЛИЧНЫЙ СЛОВАРЬ)
    // ===============================================
    document.getElementById('input-container').style.display = 'flex';

    // Гарантируем фокус на инпуте при отрисовке карточки
    const inputEl = document.getElementById('user-input');
    if (inputEl) {
        setTimeout(() => inputEl.focus(), 10);
    }

    const basePrompt = trainingState.swapped ? wordObj.ru : wordObj.foreign;
    let question = basePrompt;
    if (wordObj.hintShown) {
        const targetAnswer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');
        question = targetAnswer.length > 2 ? targetAnswer.substring(0, 2) + '...' : targetAnswer;
    }

    const textLen = question.length;
    let dynamicFontSize = '28px';
    if (textLen > 15) dynamicFontSize = '24px';
    if (textLen > 25) dynamicFontSize = '20px';
    if (textLen > 35) dynamicFontSize = '17px';

    const requiredGuesses = trainingState.mode === 'review' ? 1 : 2;
    const leftToGuess = requiredGuesses - (wordObj.correctGuesses || 0);

    const guessCounterHtml = trainingState.mode === 'review'
        ? '' : `<div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px 14px; border-radius: 12px; margin-bottom: 20px;">Осталось угадать: <b style="color: var(--text-color);">${leftToGuess}</b></div>`;

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 260px; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; position: relative; box-sizing: border-box; width: 100%;">
                
                <!-- Кнопка удаления (Мусорка) с запретом потери фокуса -->
                <div style="position: absolute; top: 12px; left: 12px; z-index: 10;">
                    <button onclick="markWordAsKnown(${wordObj.id}, '${escapedForeign}')" onmousedown="event.preventDefault()" class="btn-glass" style="width: 36px; height: 36px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; border-color: rgba(255, 59, 48, 0.4); color: #ff3b30; background: rgba(255, 59, 48, 0.1);" title="Я уже знаю это слово">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3.3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    </button>
                </div>

                <!-- Кнопка интенсива с запретом потери фокуса -->
                <div style="position: absolute; top: 12px; right: 12px; z-index: 10;">
                    <button onclick="startIntensityFromTraining('${escapedForeign}')" onmousedown="event.preventDefault()" class="btn-glass" style="width: 36px; height: 36px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; border-color: rgba(168, 129, 243, 0.4); color: #a881f3; background: rgba(168, 129, 243, 0.1);" title="Тренировать в интенсиве">
                        ⚡
                    </button>
                </div>

                <div style="position: absolute; top: 15px; left: 0; width: 100%; text-align: center; font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                    Осталось слов: <span style="color: var(--text-color);">${remainingCards}</span>
                </div>

                <div id="training-word-display" style="font-size: ${dynamicFontSize}; font-weight: bold; color: ${wordObj.hintShown ? 'var(--button-color)' : 'var(--text-color)'}; text-align: center; margin-top: 30px; margin-bottom: 10px; word-wrap: break-word; width: 100%; flex-grow: 1; display: flex; align-items: center; justify-content: center;">
                    ${question}
                </div>
                
                ${guessCounterHtml}

                <!-- Нижние кнопки с запретом потери фокуса через onmousedown -->
                <div style="display: flex; gap: 10px; width: 100%; margin-top: auto;">
                    <button onclick="showHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft">${wordObj.hintShown ? 'Скрыть' : 'Подсказка'}</button>
                    <button onclick="toggleSwap()" onmousedown="event.preventDefault()" class="btn-glass-secondary">Поменять</button>
                </div>
            </div>
        </div>
    `;
}

// 🔥 Обработка клика по кнопке викторины Оксфорда
function handleOxfordAnswer(buttonIndex, isCorrect) {
    if (trainingState.isAnimating) return;
    trainingState.isAnimating = true;

    const btn = document.getElementById(`quiz-btn-${buttonIndex}`);
    const wordObj = trainingState.activeRound[trainingState.currentIndex];

    // Определяем правильный ответ в зависимости от режима
    const isPhrasal = trainingState.source === 'phrasal';
    const targetAnswer = isPhrasal ? wordObj.foreign : wordObj.ru;

    if (isCorrect) {
        btn.style.background = 'rgba(52, 199, 89, 0.2)';
        btn.style.borderColor = '#34c759';
        btn.style.color = '#34c759';
    } else {
        btn.style.background = 'rgba(255, 59, 48, 0.2)';
        btn.style.borderColor = '#ff3b30';
        btn.style.color = '#ff3b30';

        // Подсвечиваем правильный (ищем его перебором)
        wordObj.options.forEach((opt, idx) => {
            if (opt === targetAnswer) {
                const correctBtn = document.getElementById(`quiz-btn-${idx}`);
                if (correctBtn) {
                    correctBtn.style.borderColor = '#34c759';
                    correctBtn.style.color = '#34c759';
                }
            }
        });
    }

    setTimeout(() => {
        trainingState.currentIndex++;
        trainingState.isAnimating = false;
        showCurrentWord();
    }, 1200);
}

// 🔥 ФУНКЦИИ ДЛЯ ЭКРАНА САММАРИ OXFORD 🔥
function toggleOxfordSelection(idx) {
    const word = trainingState.activeRound[idx];
    word.selectedForAdd = !word.selectedForAdd;

    const item = document.getElementById(`oxford-summary-item-${idx}`);
    const icon = document.getElementById(`oxford-summary-icon-${idx}`);

    if (word.selectedForAdd) {
        item.style.borderColor = '#34c759';
        item.style.background = 'rgba(52, 199, 89, 0.1)';
        icon.innerHTML = '✅';
    } else {
        item.style.borderColor = 'rgba(255,255,255,0.1)';
        item.style.background = 'rgba(255,255,255,0.05)';
        icon.innerHTML = '➕';
    }
}

function saveSelectedOxfordWords() {
    const wordsToSave = trainingState.activeRound
        .filter(w => !w.hidden && w.selectedForAdd)
        .map(w => ({ word_id: w.id, foreign: w.foreign, ru: w.ru }));

    if (wordsToSave.length === 0) {
        exitToMainMenu();
        return;
    }

    apiFetch('/train/oxford/add_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, words: wordsToSave })
    }).then(data => {
        if (data.success) {
            exitToMainMenu();
        } else {
            alert("Ошибка сохранения: " + data.error);
        }
    }).catch(err => {
        console.error(err);
        alert("Ошибка сети при сохранении слов.");
    });
}


function showFlashMessage(htmlContent, delay = 1000) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; overflow: hidden;">
                ${htmlContent}
            </div>
        </div>`;

    setTimeout(() => {
        if (window.currentAppMode !== 'training') return;
        trainingState.currentIndex++;
        showCurrentWord();
    }, delay);
}

// 🔥 ОБРАБОТКА ВВОДА ОТВЕТА (Обычные слова)
function handleTrainingInput(text) {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;
        if (trainingState.isAnimating) return;

        const inputEl = document.getElementById('user-input');
        const chatContainer = document.getElementById('chat-messages');

        if (chatContainer.lastElementChild && chatContainer.lastElementChild.style.alignSelf === 'flex-end') {
            chatContainer.lastElementChild.remove();
        }

        const wordObj = trainingState.activeRound[trainingState.currentIndex];
        const correctAnswer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');
        const isCorrect = text.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        const requiredGuesses = trainingState.mode === 'review' ? 1 : 2;

        if (isCorrect) {
            trainingState.isAnimating = true;
            wordObj.correctGuesses = (wordObj.correctGuesses || 0) + 1;

            if (wordObj.correctGuesses >= requiredGuesses) {
                trainingState.completedWords++;

                apiFetch('/train/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: user.id,
                        word_id: wordObj.id,
                        is_correct: true,
                        mode: trainingState.mode,
                        source: trainingState.source,
                        foreign: wordObj.foreign || '',
                        ru: wordObj.ru || ''
                    })
                });
            } else {
                trainingState.nextRound.push({ ...wordObj });
            }

            const willFinish = (trainingState.currentIndex + 1 >= trainingState.activeRound.length) && (trainingState.nextRound.length === 0);

            const wordDiv = document.getElementById('training-word-display');
            if (wordDiv) {
                const ansLen = correctAnswer.length;
                let newSize = '28px';
                if (ansLen > 15) newSize = '24px';
                if (ansLen > 25) newSize = '20px';
                if (ansLen > 35) newSize = '17px';
                if (ansLen > 50) newSize = '14px';

                wordDiv.innerText = correctAnswer;
                wordDiv.style.fontSize = newSize;
                wordDiv.style.transition = 'all 0.2s ease-out';
                wordDiv.style.color = '#34c759';
                wordDiv.style.textShadow = '0 0 15px rgba(52, 199, 89, 0.4)';
                wordDiv.style.transform = 'scale(1.05)';
            }

            if (inputEl) {
                inputEl.value = '';
                if (willFinish) inputEl.blur();
                else setTimeout(() => inputEl.focus(), 10);
            }

            setTimeout(() => {
                trainingState.currentIndex++;
                trainingState.isAnimating = false;
                showCurrentWord();
            }, 400);

        } else {
            if (inputEl) {
                inputEl.value = '';
                setTimeout(() => inputEl.focus(), 10);
            }

            let flashSize = '26px';
            if (correctAnswer.length > 15) flashSize = '22px';
            if (correctAnswer.length > 25) flashSize = '18px';
            if (correctAnswer.length > 35) flashSize = '15px';

            showFlashMessage(`
                <div style="font-size: 40px; margin-bottom: 5px;">❌</div>
                <div style="font-size: 14px; color: #ff3b30; text-align: center;">Ошибка! Правильно:</div>
                <div style="font-size: ${flashSize}; font-weight: bold; color: var(--text-color); margin-top: 10px; text-align: center; word-wrap: break-word; width: 100%; box-sizing: border-box; line-height: 1.2;">${correctAnswer}</div>
            `, 2000);

            apiFetch('/train/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.id,
                    word_id: wordObj.id,
                    is_correct: false,
                    mode: trainingState.mode,
                    source: trainingState.source,
                    foreign: wordObj.foreign || '',
                    ru: wordObj.ru || ''
                })
            });

            if (trainingState.mode === 'review') {
                trainingState.completedWords++;
            } else {
                trainingState.nextRound.push({ ...wordObj });
            }
        }
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
        trainingState.isAnimating = false;
    }
}

function showHelp() {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;

        const wordObj = trainingState.activeRound[trainingState.currentIndex];
        wordObj.hintShown = !wordObj.hintShown;

        if (wordObj.hintShown) {
            wordObj.correctGuesses = 0;
            apiFetch('/train/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.id,
                    word_id: wordObj.id,
                    is_correct: false,
                    mode: trainingState.mode,
                    source: trainingState.source,
                    foreign: wordObj.foreign || '',
                    ru: wordObj.ru || ''
                })
            });
        }

        const inputEl = document.getElementById('user-input');
        if (inputEl) setTimeout(() => inputEl.focus(), 10);

        showCurrentWord();
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
    }
}

// 🔥 Переход в интенсив
function startIntensityFromTraining(word) {
    if (typeof showIntensitySetupMode === 'function') {
        window.modeBeforeChat = window.currentAppMode;
        window.htmlBeforeChat = document.getElementById('chat-messages').innerHTML;

        showIntensitySetupMode();
        setTimeout(() => {
            if (typeof startIntensity === 'function') startIntensity(word, []);
        }, 300);

        const textInputRow = document.getElementById('text-input-row');
        if (textInputRow) textInputRow.style.display = 'none';
    } else {
        alert('Режим интенсива пока недоступен.');
    }
}