// ==========================================
// ФАЙЛ: frontend/js/image_words.js
// ==========================================

let pendingImageWords = []; // Массив слов, которые вернет ИИ

function showImageCard(htmlContent) {
    // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ (исправлен синтаксис комментария и добавлена проверка)
    if (window.isRateLimitError(htmlContent)) {
        return window.showLimitCard();
    }

    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = `<div class="image-card-container">${htmlContent}</div>`;
    }
}

// 1. Имитируем клик по скрытому инпуту загрузки файла
function triggerImageUpload() {
    document.getElementById('image-upload-input').click();
}

// 2. Обрабатываем выбранное фото и сжимаем его перед отправкой
function handleImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.currentAppMode = 'image_words';
    setAppHeader('📸 Слова с фото', true);

    // Прячем элементы главного экрана
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    // Красивый анимированный скелетон
    showImageCard(`
        <div class="scanner-wrapper">
            <div class="skeleton-box">
                <div class="scan-laser"></div>
            </div>
            <div class="skeleton-line title"></div>
            <div class="skeleton-line subtitle"></div>
        </div>
        <div class="ic-title-bold">ИИ сканирует объекты...</div>
       
    `);

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64Image = dataUrl.split(',')[1];

            sendImageToAi(base64Image);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    event.target.value = '';
}

// 3. Отправляем данные на бэкенд
// 3. Отправляем данные на бэкенд
// 3. Отправляем данные на бэкенд
function sendImageToAi(base64Image) {
    apiFetch('/words/from_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, image: base64Image })
    })
    .then(data => {
        // 🔥 ПЕРЕХВАТЧИК ЛИМИТОВ ТОКЕНОВ ДЛЯ КАРТИНОК
        if (!data.success && window.isRateLimitError(data.error)) {
            return window.showLimitCard(
                "Лимит Gemini исчерпан",
                "У вас закончились токены для провайдера <b>Gemini</b> для распознавания картинок.<br>Пожалуйста, подождите обновления токенов."
            );
        }

        if (window.isRateLimitError(data) || window.isRateLimitError(data.error)) {
            return window.showLimitCard(
                "Лимит Gemini исчерпан",
                "У вас закончились токены для провайдера <b>Gemini</b> для распознавания картинок.<br>Пожалуйста, подождите обновления токенов."
            );
        }

        if (window.currentAppMode !== 'image_words') return;

        if (data.success) {
            if (data.words && data.words.length > 0) {
                pendingImageWords = data.words;
                renderImageWordsCheckboxes(data.original, data.translation);
            } else if (data.all_known) {
                showImageCard(`
                    <div class="ic-icon-large">🧠</div>
                    <div class="ic-title-bold">Ты уже всё знаешь!</div>
                    <div class="word-checkbox-ru">Все найденные объекты уже есть в твоем словаре.</div>
                    <button onclick="exitToMainMenu()" class="btn-inline-menu">В меню</button>
                `);
            } else {
                showImageCard(`
                    <div class="ic-icon-medium">🤷‍♂️</div>
                    <div class="ic-text-normal">ИИ не смог распознать объекты на этом фото.</div>
                    <button onclick="exitToMainMenu()" class="btn-inline-menu">В меню</button>
                `);
            }
        } else {
            if (window.isRateLimitError(data.error)) {
                return window.showLimitCard(
                    "Лимит Gemini исчерпан",
                    "У вас закончились токены для провайдера <b>Gemini</b> для распознавания картинок.<br>Пожалуйста, подождите обновления токенов."
                );
            }
            showImageCard(`❌ Ошибка сервера: ${data.error}`);
        }
    })
    .catch(err => {
        if (window.currentAppMode !== 'image_words') return;
        if (window.isRateLimitError(err.message)) {
            return window.showLimitCard(
                "Лимит Gemini исчерпан",
                "У вас закончились токены для провайдера <b>Gemini</b> для распознавания картинок.<br>Пожалуйста, подождите обновления токенов."
            );
        }
        showImageCard(`<div class="ic-icon-medium">⚠️</div><div>Ошибка сети: ${err.message}</div>`);
    });
}

// 4. Отрисовываем чекбоксы
// 4. Отрисовываем результаты сканирования (ТОЧНО КАК В ПЕРЕВОДЧИКЕ ТЕКСТА)
function renderImageWordsCheckboxes(original, translation) {
    let wordsHtml = `
        <div style="margin-top: 20px; text-align: left; padding-bottom: 80px;">
            <div id="image-words-list" style="display: flex; flex-direction: column; gap: 8px;">
    `;

    pendingImageWords.forEach((w) => {
        const safeWord = (w.foreign || w.word || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeTranslation = (w.ru || w.translation || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");

        wordsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 12px 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-weight: 600; color: var(--text-color); font-size: 15px; margin-bottom: 3px;">${w.foreign || w.word}</div>
                    <div style="font-size: 13px; color: rgba(255,255,255,0.6);">${w.ru || w.translation}</div>
                </div>
                <button onclick="toggleImageWordState(this)" 
                        data-selected="false"
                        data-word="${safeWord}"
                        data-translation="${safeTranslation}"
                        style="width: 36px; height: 36px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.6); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; outline: none; font-size: 14px; -webkit-tap-highlight-color: transparent;">➕</button>
            </div>
        `;
    });

    wordsHtml += `
            </div>
        </div>
        
        <!-- 🔥 ПЛАВАЮЩАЯ ЗЕЛЕНАЯ КНОПКА СОХРАНЕНИЯ -->
        <button id="save-image-words-btn" onclick="confirmImageWords()" class="btn-glass btn-glass-green" style="position: fixed; bottom: 30px; left: 5%; width: 90%; height: 52px; display: none; z-index: 1000; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3); font-size: 16px; -webkit-tap-highlight-color: transparent;">Сохранить выбранные</button>
    `;

    showImageCard(`
        <div style="display: flex; flex-direction: column; width: 100%; position: relative;">
            
            <!-- 🔥 КРЕСТИК ЗАКРЫТИЯ -->
            <button onclick="exitToMainMenu()" class="btn-glass btn-glass-neutral" style="position: absolute; top: -10px; right: -10px; width: 34px; height: 34px; padding: 0; border-radius: 50%; display: flex; justify-content: center; align-items: center; z-index: 10; -webkit-tap-highlight-color: transparent;">
                <span style="font-size: 14px; opacity: 0.8;">✕</span>
            </button>

            <div style="text-align: left; padding-right: 30px;">
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Распознанный текст:</div>
                <div style="font-size: 15px; color: rgba(255,255,255,0.7); margin-bottom: 16px; word-wrap: break-word; line-height: 1.4;">${original || "Текст не найден"}</div>
                
                <div style="font-size: 11px; color: #dfcbf7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: bold;">Перевод:</div>
                <div style="font-size: 17px; color: var(--text-color); word-wrap: break-word; line-height: 1.4; font-weight: 500;">${translation || "Перевод не найден"}</div>
            </div>
            
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 20px 0;">
            
            <div style="font-size: 14px; font-weight: bold; color: var(--button-color); margin-bottom: 5px; text-align: left;">📸 Найдено ${pendingImageWords.length} слов</div>
            ${wordsHtml}
        </div>
    `);
}

// 5. Сохраняем выбранные слова в словарь
// 5. Сохраняем выбранные слова в словарь
function confirmImageWords() {
    const list = document.getElementById('image-words-list');
    const saveBtn = document.getElementById('save-image-words-btn');
    if (!list || !saveBtn) return;

    const selectedBtns = list.querySelectorAll('button[data-selected="true"]');
    if (selectedBtns.length === 0) return;

    const wordsToSave = [];
    selectedBtns.forEach(btn => {
        wordsToSave.push({
            foreign: btn.getAttribute('data-word'),
            ru: btn.getAttribute('data-translation')
        });
    });

    // Изменяем текст плавающей кнопки
    saveBtn.innerHTML = '⏳ Сохраняю...';
    saveBtn.style.pointerEvents = 'none';

    apiFetch('/words/add_multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, words: wordsToSave })
    })
    .then(data => {
        if(data.success) {
            saveBtn.innerHTML = '✅ Успешно сохранено!';
            saveBtn.style.background = 'rgba(16, 185, 129, 0.9)'; // Делаем зеленую кнопку ярче

            // Обновляем счетчик слов в главном меню
            const mpWords = document.getElementById('mp-words');
            if (mpWords && data.added_count) {
                const currentCount = parseInt(mpWords.innerText) || 0;
                mpWords.innerText = currentCount + data.added_count;
            }

            selectedBtns.forEach(btn => {
                btn.onclick = null;
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.6';
            });

            const unselectedBtns = list.querySelectorAll('button[data-selected="false"]');
            unselectedBtns.forEach(btn => {
                btn.parentElement.style.opacity = '0.3';
                btn.onclick = null;
            });

            // Возврат в меню через 1.2 секунды
            setTimeout(() => {
                exitToMainMenu();
            }, 1200);

        } else {
            saveBtn.innerHTML = '❌ Ошибка';
            saveBtn.style.pointerEvents = 'auto';
        }
    })
    .catch(err => {
        saveBtn.innerHTML = '⚠️ Ошибка сети';
        saveBtn.style.pointerEvents = 'auto';
    });
}

// Функция для переключения состояния крестика (аналог toggleLocalWordState из переводчика)
function toggleImageWordState(btn) {
    const isSelected = btn.getAttribute('data-selected') === 'true';

    if (!isSelected) {
        btn.setAttribute('data-selected', 'true');
        btn.style.background = 'rgba(16, 185, 129, 0.35)';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.8)';
        btn.style.color = '#34d399';
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    } else {
        btn.setAttribute('data-selected', 'false');
        btn.style.background = 'rgba(255, 255, 255, 0.08)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btn.style.color = 'rgba(255, 255, 255, 0.6)';
    }

    const list = document.getElementById('image-words-list');
    const saveBtn = document.getElementById('save-image-words-btn');
    if (list && saveBtn) {
        // Показываем кнопку сохранения, только если выбран хотя бы один крестик
        const hasSelected = list.querySelector('button[data-selected="true"]') !== null;
        saveBtn.style.display = hasSelected ? 'flex' : 'none';
    }
}