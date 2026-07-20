// js/app.js
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();


let user = tg.initDataUnsafe?.user || { id: 8407744578, first_name: "Пользователь (Резерв)" };

window.userProfile = null;
window.currentAppMode = 'menu';
let isProfileVisible = false;
// 🔥 Озвучка
function speakWord(text, lang) {
    if (!('speechSynthesis' in window)) {
        console.warn("Ваш браузер не поддерживает озвучку.");
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    // lang: 'en' или 'de' переводим в коды голосов
    utterance.lang = lang === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

// ==========================================
// 🔥 ГОЛОСОВОЙ ВВОД (Web Audio API)
// ==========================================

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function startVoiceInput() {
    const micBtn = document.getElementById('mic-btn');
    const wordInput = document.getElementById('user-input');

    if (!isRecording) {
        try {
            // Запрашиваем доступ
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(currentStream, { mimeType: 'audio/webm' }); // Используем webm для лучшей совместимости
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                // 🔥 ОЧИСТКА: Останавливаем все дорожки микрофона
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }

                micBtn.innerText = '⏳';
                micBtn.classList.remove('mic-button-recording');
                wordInput.placeholder = "Распознавание...";

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.webm');

                try {
                    // Используем твой BASE_URL и добавляем заголовок для ngrok
                    const response = await fetch(`${BASE_URL}/speech/recognize?chat_id=${user.id}`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            "ngrok-skip-browser-warning": "true"
                        }
                        // ВАЖНО: 'Content-Type' здесь писать не нужно, браузер сам поставит нужный для FormData
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
        // Остановка
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
    }
}

// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
// 🔥 Глобальная функция для смены заголовка и стрелочки "Назад"
function setAppHeader(title, showBackBtn = true) {
    const titleEl = document.getElementById('top-bar-title');
    const backBtnEl = document.getElementById('back-btn');
    const settingsBtnEl = document.getElementById('settings-btn'); // Ищем нашу новую шестеренку

    if (titleEl) titleEl.innerText = title;

    // Управляем кнопкой "Назад"
    if (backBtnEl) backBtnEl.style.display = showBackBtn ? 'flex' : 'none';

    // 🔥 Управляем "Шестеренкой": показываем её ТОЛЬКО когда мы в главном меню (когда нет кнопки Назад)
    if (settingsBtnEl) {
        settingsBtnEl.style.display = showBackBtn ? 'none' : 'block';
    }
}

function switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(screenId);

    // 1. Убираем класс active у всех
    screens.forEach(s => s.classList.remove('active'));

    // 2. Делаем экран видимым (display: block)
    targetScreen.style.display = 'block';

    // 3. Добавляем active с маленькой задержкой (чтобы браузер «понял», что нужно анимировать)
    setTimeout(() => {
        targetScreen.classList.add('active');

        // 4. Через время анимации скрываем старые экраны полностью
        screens.forEach(s => {
            if (s.id !== screenId) s.style.display = 'none';
        });
    }, 50);
}

// 🔥 Обновляем мини-плашку вместо старой гигантской карточки
// 🔥 Обновляем мини-плашку (с полными названиями языков и флагами)
// 🔥 Обновляем мини-плашку (теперь с загрузкой реальной аватарки!)
function updateProfileUI(data) {
    window.userProfile = data;

    // Словари для красивого вывода
    const langMap = { "en": "Английский 🇬🇧", "de": "Немецкий 🇩🇪" };
    const lang = langMap[data.language] || data.language || "Не выбран";
    const diff = data.difficulty || "Не задан";
    const count = (data.words_count !== undefined) ? data.words_count : 0;

    // Вставляем данные в плашку
    document.getElementById('mp-lang').innerText = lang;
    document.getElementById('mp-diff').innerText = diff;
    document.getElementById('mp-words').innerText = count;

    // 📸 Проверяем и устанавливаем аватарку из Telegram
    const avatarContainer = document.getElementById('mp-avatar');
    if (user && user.photo_url) {
        // Если фото есть, вставляем картинку (object-fit: cover обрежет её ровно по кругу)
        avatarContainer.innerHTML = `<img src="${user.photo_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        avatarContainer.style.background = 'transparent'; // Убираем серый фон
    } else {
        // Если фото нет или скрыто, оставляем смайлик
        avatarContainer.innerHTML = '👤';
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

    // 🔥 ИНТЕГРАЦИЯ СТИЛЕЙ: Если мы в живом чате, рисуем телеграм-пузырь
    if (window.currentAppMode === 'live_chat' && typeof addTelegramStyleMessage === 'function') {
        addTelegramStyleMessage(text, true);
    } else {
        addMessageToOutput(text, true);
    }

    inputField.value = '';

    // МАРШРУТИЗАЦИЯ РЕЖИМОВ
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

// Обработка нажатия Enter на стандартной клавиатуре
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        document.getElementById('btn-send').click();
    }
});

// Обработка Enter в быстром переводчике
document.getElementById('quick-translator-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (typeof startQuickTranslation === 'function') startQuickTranslation();
    }
});

// 🔥 НОВОЕ: Обработка Enter в строке живого чата на главном экране
document.getElementById('live-chat-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (typeof startLiveChatFromMenu === 'function') startLiveChatFromMenu();
    }
});

function startQuickTranslation() {
    const input = document.getElementById('quick-translator-input');
    const text = input ? input.value.trim() : '';
    if (!text) return;
    input.value = '';

    enterAddWordMode(true);
    document.getElementById('user-input').value = text;
    hideTextInput();
    if (typeof handleAddWordInput === 'function') handleAddWordInput(text);
}

// Запрос профиля
apiFetch(`/profile?chat_id=${user.id}`)
    .then(data => {
        if (data.is_new_user) {
            switchScreen('screen-onboarding');
        } else {
            updateProfileUI(data);
            switchScreen('screen-main');
        }
    })
    .catch(err => console.error(err));

function exitToMainMenu() {
    window.currentAppMode = 'menu';
    setAppHeader('Главное меню', false);

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '';
    // Сбрасываем Flex-настройки чата, чтобы они не ломали другие режимы
    chatContainer.style.display = 'block';

    document.getElementById('mini-profile').style.display = 'flex';
    document.getElementById('main-menu-cards').style.display = 'grid';

    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'block';

    // 🔥 Возвращаем поле живого чата
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'block';

    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('btn-next-task')) document.getElementById('btn-next-task').style.display = 'none';
    if (document.getElementById('fab-next-task')) document.getElementById('fab-next-task').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';

    document.getElementById('user-input').placeholder = "Напиши слово...";
}
