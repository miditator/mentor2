// js/app.js
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let user = tg.initDataUnsafe?.user || { id: 8407744578, first_name: "Пользователь (Резерв)" };

// 🔥 Отладка БД по нажатию клавиши (например, F10)
document.addEventListener('keydown', function(event) {
    if (event.key === 'F10') {
        event.preventDefault(); // Предотвращаем стандартное поведение
        showDatabaseStateModal();
    }
});

function showDatabaseStateModal() {
    console.log("📊 Запрос состояния базы данных...");

    apiFetch(`/debug/db_dump?chat_id=${user.id}`)
        .then(data => {
            const chatContainer = document.getElementById('chat-messages');
            if (!chatContainer) return;

            if (data.success) {
                // Красиво форматируем JSON в читаемый текст
                const prettyJson = JSON.stringify(data.tables, null, 2);

                chatContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
                        <div style="background: rgba(10, 15, 25, 0.95); border: 1px solid rgba(0, 255, 100, 0.3); border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); box-sizing: border-box; width: 100%;">
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="font-size: 14px; font-weight: bold; color: #00ff64; text-transform: uppercase; letter-spacing: 1px;">
                                    🟢 Состояние базы данных (Debug)
                                </span>
                                <button onclick="exitToMainMenu()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;">Закрыть ✕</button>
                            </div>
                            
                            <div style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 12px; max-height: 350px; overflow-y: auto;">
                                <pre style="color: #00ffcc; font-family: monospace; font-size: 11px; margin: 0; white-space: pre-wrap; word-break: break-all;">${prettyJson}</pre>
                            </div>
                            
                        </div>
                    </div>
                `;

                // Если нужно, скрываем поле ввода на время просмотра отладки
                const inputContainer = document.getElementById('input-container');
                if (inputContainer) inputContainer.style.display = 'none';

            } else {
                alert("Ошибка получения БД: " + data.error);
            }
        })
        .catch(err => {
            console.error("Ошибка сети при запросе БД:", err);
        });
}


// 🔥 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ТЕКСТА В ШАПКЕ
window.promoTexts = [
    "🔥 Тренируй каждый день",
    "📚 Ежедневная тренировка",
    "✨ Грамматика и слова"
];
window.currentPromoIndex = 0;
window.promoIntervalId = null;




window.userProfile = null;
window.currentAppMode = 'menu';
let isProfileVisible = false;

// 🔥 Озвучка через собственный бэкенд
function speakWord(text, lang) {
    console.log("🔊 Клик по озвучке, текст:", text, "язык:", lang);

    const targetLang = lang === 'de' ? 'de' : 'en';
    const audioUrl = `${BASE_URL}/speech/tts?text=${encodeURIComponent(text)}&lang=${targetLang}`;

    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.9;

    audio.play().then(() => {
        console.log("▶ Озвучка успешно воспроизведена с бэкенда");
    }).catch(err => {
        console.error("❌ Ошибка воспроизведения:", err);
    });
}

// ==========================================
// 🔥 ГОЛОСОВОЙ ВВОД (Web Audio API)
// ==========================================

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let globalAudioStream = null;

async function startVoiceInput() {
    const micBtn = document.getElementById('mic-btn');
    const wordInput = document.getElementById('user-input');

    if (!isRecording) {
        try {
            if (!globalAudioStream || !globalAudioStream.active) {
                globalAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            mediaRecorder = new MediaRecorder(globalAudioStream, { mimeType: 'audio/webm' });
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                micBtn.innerText = '⏳';
                micBtn.classList.remove('mic-button-recording');
                wordInput.placeholder = "Распознавание...";

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.webm');

                try {
                    const response = await fetch(`${BASE_URL}/speech/recognize?chat_id=${user.id}`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            "ngrok-skip-browser-warning": "true"
                        }
                    });
                    const data = await response.json();

                    if (data.success && data.text) {
                        wordInput.value = data.text;
                    } else {
                        wordInput.placeholder = "Не удалось распознать";
                    }
                } catch (err) {
                    wordInput.placeholder = "Ошибка сервера";
                } finally {
                    micBtn.innerText = '🎙️';
                    setTimeout(() => wordInput.placeholder = "Напиши слово...", 2000);
                }
            };

            mediaRecorder.start();
            isRecording = true;
            micBtn.innerText = '🛑';
            micBtn.classList.add('mic-button-recording');
            wordInput.value = '';
            wordInput.placeholder = "Слушаю...";

        } catch (err) {
            console.error("Ошибка микрофона:", err);
            alert("Пожалуйста, разрешите доступ к микрофону в настройках Telegram.");
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
    }
}

// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
function setAppHeader(title, showBackBtn = true) {
    const titleEl = document.getElementById('top-bar-title');
    const backBtnEl = document.getElementById('back-btn');
    const settingsBtnEl = document.getElementById('settings-btn');
    const topBarEl = document.getElementById('top-bar');
    const tickerEl = document.getElementById('header-ticker');
    const progressBannerEl = document.getElementById('progress-banner-block'); // 🔥 Получаем блок прогресс-баров

    if (typeof initProgressBars === 'function') {
        initProgressBars();
    }

    if (backBtnEl && !backBtnEl.innerHTML.includes('<svg')) {
        backBtnEl.innerHTML = typeof APP_ICONS !== 'undefined' && APP_ICONS.chevronLeft ? APP_ICONS.chevronLeft : '⬅️';
    }

    if (titleEl) titleEl.innerText = title;

    if (showBackBtn) {
        // 🔹 Мы внутри приложения (например, в словаре или тренировке)
        if (topBarEl) topBarEl.style.display = 'flex';
        if (backBtnEl) backBtnEl.style.display = 'flex';
        if (settingsBtnEl) settingsBtnEl.style.display = 'none';
        if (tickerEl) tickerEl.style.display = 'none';
        if (titleEl) titleEl.style.display = 'inline';
        if (progressBannerEl) progressBannerEl.style.display = 'none'; // 🔥 Прячем прогресс-бары внутри разделов
    } else {
        // 🔹 Мы в главном меню
        if (topBarEl) topBarEl.style.display = 'none';
        if (backBtnEl) backBtnEl.style.display = 'none';
        if (settingsBtnEl) settingsBtnEl.style.display = 'none';
        if (tickerEl) tickerEl.style.display = 'none';
        if (titleEl) titleEl.style.display = 'none';
        if (progressBannerEl) progressBannerEl.style.display = 'flex'; // 🔥 Показываем прогресс-бары в меню
    }
}

function switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(screenId);

    screens.forEach(s => s.classList.remove('active'));
    targetScreen.style.display = 'block';

    setTimeout(() => {
        targetScreen.classList.add('active');
        screens.forEach(s => {
            if (s.id !== screenId) s.style.display = 'none';
        });
    }, 50);
}

// Обновление мини-плашки профиля
function updateProfileUI(data) {
    window.userProfile = data;

    const langMap = { "en": "🇬🇧", "de": "🇩🇪" };
    const lang = langMap[data.language] || data.language || "Не выбран";
    const diff = data.difficulty || "Не задан";
    const count = (data.words_count !== undefined) ? data.words_count : 0;

    document.getElementById('mp-lang').innerText = lang;
    document.getElementById('mp-diff').innerText = diff;
    document.getElementById('mp-words').innerText = count;

    const avatarContainer = document.getElementById('mp-avatar');
    if (avatarContainer) {
        avatarContainer.style.display = 'flex';
        if (user && user.photo_url) {
            avatarContainer.innerHTML = `<img src="${user.photo_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            avatarContainer.style.background = 'transparent';
        } else {
            avatarContainer.innerHTML = '👤';
        }
    }

    document.getElementById('mini-profile').style.display = 'flex';
    isProfileVisible = true;
}

function addMessageToOutput(text, isUser = false) {
    const chatMessages = document.getElementById('chat-messages');
    const outputArea = document.getElementById('output-area');
    const msgDiv = document.createElement('div');

    msgDiv.style.padding = '12px 15px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.marginBottom = '10px';
    msgDiv.style.fontSize = '15px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.wordWrap = 'break-word';

    if (isUser) {
        msgDiv.style.backgroundColor = 'var(--button-color)';
        msgDiv.style.color = '#ffffff';
        msgDiv.style.alignSelf = 'flex-end';
    } else {
        msgDiv.style.backgroundColor = 'var(--secondary-bg-color)';
        msgDiv.style.border = '1px solid rgba(112, 132, 153, 0.2)';
        msgDiv.style.color = 'var(--text-color)';
        msgDiv.style.alignSelf = 'flex-start';
    }

    msgDiv.innerHTML = text;
    chatMessages.appendChild(msgDiv);
    outputArea.scrollTop = outputArea.scrollHeight;
}

document.getElementById('btn-send').addEventListener('click', () => {
    const inputField = document.getElementById('user-input');
    const text = inputField.value.trim();
    if (!text) return;

    if (window.currentAppMode === 'live_chat' && typeof addTelegramStyleMessage === 'function') {
        addTelegramStyleMessage(text, true);
    } else {
        addMessageToOutput(text, true);
    }

    inputField.value = '';

    if (window.currentAppMode === 'add_word' && typeof handleAddWordInput === 'function') {
        handleAddWordInput(text);
    } else if (window.currentAppMode === 'task' && typeof handleTaskInput === 'function') {
        handleTaskInput(text);
    } else if (window.currentAppMode === 'training' && typeof handleTrainingInput === 'function') {
        handleTrainingInput(text);
    } else if (window.currentAppMode === 'intensity_setup') {
        startIntensity(text);
    } else if (window.currentAppMode === 'intensity_active') {
        handleIntensityInput(text);
    } else if (window.currentAppMode === 'grammar_training' && typeof handleGrammarInput === 'function') {
        handleGrammarInput(text);
    } else if (window.currentAppMode === 'live_chat' && typeof handleLiveChatInput === 'function') {
        handleLiveChatInput(text);
    }
});

document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // 🔥 Блокируем системное скрытие клавиатуры
        document.getElementById('btn-send').click();
    }
});

// 🔥 Опционально: Если ты иногда нажимаешь на саму кнопку "Отправить" пальцем,
// добавь этот код, чтобы клик по ней не отбирал фокус у поля ввода:
document.getElementById('btn-send').addEventListener('mousedown', function(e) {
    e.preventDefault();
});

document.getElementById('quick-translator-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (typeof startQuickTranslation === 'function') startQuickTranslation();
    }
});

document.getElementById('live-chat-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (typeof startLiveChatFromMenu === 'function') startLiveChatFromMenu();
    }
});

// Запрос профиля
// Запрос профиля
// Запрос профиля
// Запрос профиля
// Запрос профиля
const telegramName = encodeURIComponent(user.first_name || 'Студент');
apiFetch(`/profile?chat_id=${user.id}&username=${telegramName}`)
    .then(data => {
        window.currentUsername = data.username || user.first_name || "Студент";

        if (data.is_new_user) {
            switchScreen('screen-onboarding');
        } else {
            updateProfileUI(data);

            // 🔥 Проверяем, пришли ли по ссылке задания из бота
            const urlParams = new URLSearchParams(window.location.search);
            const targetPage = urlParams.get('page');

            if (targetPage === 'task' && data.active_task && data.active_task.phrase) {
                console.log("🔥 Активируем экран и запускаем задачу из базы");

                // 1. Сначала делаем основной экран видимым и активным
                switchScreen('screen-main');

                // 2. Затем отрисовываем саму карточку задания штатным методом
                showExistingTask(data.active_task);
            } else {
                // Обычный запуск главного меню
                switchScreen('screen-main');
                setAppHeader(`${window.currentUsername}! 👋`, false);
            }
        }
    })
    .catch(err => console.error(err));

function exitToMainMenu() {
    window.currentAppMode = 'menu';
    setAppHeader(`${window.currentUsername || 'Студент'}! 👋`, false);

    const actionsEl = document.getElementById('top-bar-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '';
    chatContainer.style.display = 'block';

    document.getElementById('mini-profile').style.display = 'flex';

    // 🔥 Возвращаем видимость прогресс-баров в главном меню
    const progressBannerEl = document.getElementById('progress-banner-block');
    if (progressBannerEl) progressBannerEl.style.display = 'flex';

    const avatarContainer = document.getElementById('mp-avatar');
    if (avatarContainer) avatarContainer.style.display = 'flex';

    document.getElementById('main-menu-cards').style.display = 'grid';

    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'block';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'block';

    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('btn-next-task')) document.getElementById('btn-next-task').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';

    document.getElementById('user-input').placeholder = "Напиши слово...";
}

// ==========================================
// 🔥 ГЛОБАЛЬНАЯ ОБРАБОТКА ЛИМИТОВ ТОКЕНОВ
// ==========================================
// 🔥 Проверяем именно реальное исчерпание токенов/квоты, а не минутный лимит запросов
window.isRateLimitError = function(err) {
    if (!err) return false;
    const str = typeof err === 'string' ? err.toLowerCase() : JSON.stringify(err).toLowerCase();

    // Срабатываем строго при исчерпании токенов/квоты или достижении TPD лимита
    return str.includes('rate_limit_exceeded') ||
           str.includes('tokens per day') ||
           str.includes('insufficient_quota') ||
           (str.includes('limit') && str.includes('day'));
};

window.showLimitCard = function() {
    const chatContainer = document.getElementById('chat-messages');
    const inputContainer = document.getElementById('input-container');
    const textInputRow = document.getElementById('text-input-row');

    // Прячем строки ввода, чтобы нельзя было дальше писать
    if (inputContainer) inputContainer.style.display = 'none';
    if (textInputRow) textInputRow.style.display = 'none';

    // Отрисовываем премиальную карточку ошибки
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; margin-top: 15px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 280px; background: linear-gradient(135deg, rgba(30, 20, 20, 0.95) 0%, rgba(18, 8, 8, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 59, 48, 0.4); box-shadow: 0 10px 40px rgba(255, 59, 48, 0.15); padding: 30px 20px; text-align: center; width: 100%; box-sizing: border-box;">
                
                <div style="font-size: 54px; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(255,59,48,0.5));">🔋</div>
                
                <div style="font-size: 20px; font-weight: bold; color: #ff453a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
                    Токены исчерпаны
                </div>
                
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; margin-bottom: 25px; padding: 0 10px;">
                    Твой лимит запросов к нейросети закончился.<br>Пожалуйста, пополни баланс или дождись обновления квоты, чтобы продолжить тренировки.
                </div>
                
                <button onclick="exitToMainMenu()" class="btn-glass" style="background: rgba(255, 59, 48, 0.15); color: #ff453a; border: 1px solid rgba(255, 59, 48, 0.3); width: 100%; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                    🏠 Вернуться в меню
                </button>
            </div>
        </div>
    `;
};

// ==========================================
// 🔥 АНИМАЦИЯ ПРОГРЕСС-БАРА НА ГЛАВНОМ ЭКРАНЕ
// ==========================================
function animateMainProgress(type) {
    // type принимает значения 'words' или 'phrases'

    // 1. Находим контейнеры баров на главном экране (подставь свои реальные ID)
    const wordsBarContainer = document.getElementById('progress-container-words');
    const phrasesBarContainer = document.getElementById('progress-container-phrases');
    const activeBar = document.getElementById(`progress-bar-${type}`);

    // 2. Скрываем оба, чтобы вывести только один целевой
    if (wordsBarContainer) wordsBarContainer.style.display = 'none';
    if (phrasesBarContainer) phrasesBarContainer.style.display = 'none';

    const activeContainer = type === 'words' ? wordsBarContainer : phrasesBarContainer;

    if (!activeContainer || !activeBar) return;

    // 3. Делаем нужный контейнер видимым
    activeContainer.style.display = 'block';

    // 4. Считаем процент заполнения (берем из профиля, цель по умолчанию - 10)
    const currentScore = type === 'words'
        ? (window.userProfile?.words_today || 0)
        : (window.userProfile?.phrases_today || 0);
    const goal = window.userProfile?.daily_goal || 10;
    const percent = Math.min((currentScore / goal) * 100, 100);

    // 5. Запускаем плавную CSS-анимацию
    requestAnimationFrame(() => {
        activeBar.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        activeBar.style.width = `${percent}%`;
    });

    // 6. Обновляем текстовые счетчики (переиспользуем твою функцию)
    if (typeof initProgressBars === 'function') {
        setTimeout(initProgressBars, 100);
    }
}