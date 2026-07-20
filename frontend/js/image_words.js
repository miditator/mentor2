// ==========================================
// ФАЙЛ: frontend/js/image_words.js
// ==========================================

let pendingImageWords = []; // Массив слов, которые вернет ИИ

function showImageCard(htmlContent) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `<div class="image-card-container">${htmlContent}</div>`;
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
function sendImageToAi(base64Image) {
    apiFetch('/words/from_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, image: base64Image })
    })
    .then(data => {
        // Защита: если юзер уже вышел в меню, прерываем отрисовку
        if (window.currentAppMode !== 'image_words') {
            console.log("Анализ фото завершен в фоне, отрисовка отменена.");
            return;
        }

        if (data.success) {
            if (data.words && data.words.length > 0) {
                pendingImageWords = data.words;
                renderImageWordsCheckboxes();
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
            showImageCard(`❌ Ошибка сервера: ${data.error}`);
        }
    })
    .catch(err => {
        if (window.currentAppMode !== 'image_words') return;
        showImageCard(`<div class="ic-icon-medium">⚠️</div><div>Ошибка сети: ${err.message}</div>`);
    });
}

// 4. Отрисовываем чекбоксы
function renderImageWordsCheckboxes() {
    let checkboxesHtml = pendingImageWords.map((w, index) => `
        <label class="word-checkbox-label">
            <input type="checkbox" value="${index}" checked>
            <div class="word-checkbox-text">
                <span class="word-checkbox-foreign">${w.foreign}</span>
                <span class="word-checkbox-ru">${w.ru}</span>
            </div>
        </label>
    `).join('');

    showImageCard(`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
            <div class="image-words-title">
                📸 Найдено ${pendingImageWords.length} слов, которых нет у тебя в словаре
            </div>
            <div id="image-words-container" class="image-words-scroll-box">
                ${checkboxesHtml}
            </div>
            <div class="image-card-buttons-row">
                <button onclick="confirmImageWords()" class="btn-success-save">✅ Сохранить</button>
                <button onclick="exitToMainMenu()" class="btn-cancel-exit">❌ Отмена</button>
            </div>
        </div>
    `);
}

// 5. Сохраняем выбранные слова в словарь
function confirmImageWords() {
    const checkedBoxes = document.querySelectorAll('#image-words-container input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        alert("Выбери хотя бы одно слово для сохранения!");
        return;
    }

    const wordsToSave = Array.from(checkedBoxes).map(cb => pendingImageWords[parseInt(cb.value)]);
    showImageCard(`<div class="ic-icon-medium">💾</div><div class="word-checkbox-ru">Сохраняем слова...</div>`);

    apiFetch('/words/add_multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, words: wordsToSave })
    })
    .then(data => {
        if(data.success) {
            showImageCard(`
                <div class="ic-icon-success">✅</div>
                <div class="ic-title-success">Успешно сохранено!</div>
                <div class="word-checkbox-ru">Добавлено слов: ${wordsToSave.length} шт.</div>
            `);

            setTimeout(() => {
                apiFetch(`/profile?chat_id=${user.id}`).then(profileData => {
                    if (typeof updateProfileUI === 'function') updateProfileUI(profileData);
                    exitToMainMenu();
                });
            }, 1500);
        } else {
            showImageCard(`❌ Ошибка сохранения: ${data.error}`);
            setTimeout(renderImageWordsCheckboxes, 2500);
        }
    })
    .catch(err => {
        showImageCard(`❌ Ошибка сети: ${err.message}`);
        setTimeout(renderImageWordsCheckboxes, 2500);
    });
}