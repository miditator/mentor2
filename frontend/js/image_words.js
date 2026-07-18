// ==========================================
// ФАЙЛ: frontend/js/image_words.js
// ==========================================

let pendingImageWords = []; // Массив слов, которые вернет ИИ

function showImageCard(htmlContent) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; text-align: center;">
            ${htmlContent}
        </div>`;
}

// 1. Имитируем клик по скрытому инпуту загрузки файла
function triggerImageUpload() {
    document.getElementById('image-upload-input').click();
}

// 2. Обрабатываем выбранное фото
function handleImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.currentAppMode = 'image_words';
    setAppHeader('📸 Слова с фото', true);

    // Прячем всё с главного экрана
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';

    showImageCard(`
        <div style="font-size: 50px; margin-bottom: 15px;">🔍</div>
        <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Изучаем фото...</div>
        <div style="font-size: 14px; color: var(--hint-color);">ИИ ищет самые интересные предметы и действия на картинке. Это займет пару секунд.</div>
    `);

    // Читаем картинку и превращаем в Base64 для отправки на бэкенд
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result.split(',')[1];
        sendImageToAi(base64Image);
    };
    reader.readAsDataURL(file);

    // Сбрасываем инпут, чтобы можно было загрузить ту же картинку еще раз
    event.target.value = '';
}

// 3. Отправляем на бэкенд
function sendImageToAi(base64Image) {
    // ВАЖНО: Тебе нужно будет создать этот эндпоинт на Python бэкенде!
    apiFetch('/words/from_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, image: base64Image })
    })
    .then(data => {
        if (data.success && data.words && data.words.length > 0) {
            pendingImageWords = data.words; // Ожидаем массив: [{foreign: "...", ru: "..."}, ...]
            renderImageWordsCheckboxes();
        } else {
            showImageCard(`
                <div style="font-size: 40px; margin-bottom: 10px;">🤷‍♂️</div>
                <div style="font-size: 16px; color: var(--text-color);">ИИ не смог распознать объекты на этом фото.</div>
                <button onclick="exitToMainMenu()" style="margin-top: 15px; padding: 10px 20px; background: var(--button-color); border: none; border-radius: 8px; color: #fff; cursor: pointer;">В меню</button>
            `);
        }
    })
    .catch(err => {
        showImageCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети: ${err.message}</div>`);
    });
}

// 4. Отрисовываем чекбоксы
function renderImageWordsCheckboxes() {
    let checkboxesHtml = pendingImageWords.map((w, index) => `
        <label style="display: flex; align-items: center; justify-content: flex-start; width: 100%; background: rgba(112, 132, 153, 0.05); padding: 12px 15px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; border: 1px solid rgba(112, 132, 153, 0.2); box-sizing: border-box; transition: 0.2s;">
            <input type="checkbox" value="${index}" checked style="width: 18px; height: 18px; margin-right: 15px; accent-color: var(--button-color); cursor: pointer; flex-shrink: 0;">
            <div style="display: flex; flex-direction: column; text-align: left;">
                <span style="font-size: 16px; color: var(--text-color); font-weight: bold;">${w.foreign}</span>
                <span style="font-size: 13px; color: var(--hint-color);">${w.ru}</span>
            </div>
        </label>
    `).join('');

    showImageCard(`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
            <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">📸 Найдено на фото:</div>
            
            <div id="image-words-container" style="width: 100%; display: flex; flex-direction: column; margin-bottom: 20px; max-height: 350px; overflow-y: auto; padding-right: 5px;">
                ${checkboxesHtml}
            </div>
            
            <div style="display: flex; gap: 10px; width: 100%;">
                <button onclick="confirmImageWords()" style="flex: 1; padding: 14px; background: #34c759; border: none; border-radius: 12px; color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">✅ Сохранить</button>
                <button onclick="exitToMainMenu()" style="flex: 1; padding: 14px; background: rgba(112, 132, 153, 0.1); border: 1px solid rgba(112, 132, 153, 0.2); border-radius: 12px; color: var(--text-color); font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">❌ Отмена</button>
            </div>
        </div>
    `);
}

// 5. Сохраняем выбранные слова
function confirmImageWords() {
    const checkedBoxes = document.querySelectorAll('#image-words-container input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        alert("Выбери хотя бы одно слово для сохранения!");
        return;
    }

    // Собираем выбранные слова в массив
    const wordsToSave = Array.from(checkedBoxes).map(cb => {
        const wordData = pendingImageWords[parseInt(cb.value)];
        return wordData;
    });

    showImageCard(`<div style="font-size: 40px; margin-bottom: 15px;">💾</div><div style="color: var(--hint-color);">Сохраняем слова...</div>`);

    // ВАЖНО: Этот эндпоинт тоже нужно создать (для сохранения массива слов)
    apiFetch('/words/add_multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, words: wordsToSave })
    })
    .then(data => {
        if(data.success) {
            showImageCard(`
                <div style="font-size: 60px; margin-bottom: 10px;">✅</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">Успешно сохранено!</div>
                <div style="font-size: 14px; color: var(--hint-color);">Добавлено слов: ${wordsToSave.length} шт.</div>
            `);

            // Обновляем стату профиля и выходим
            setTimeout(() => {
                apiFetch(`/profile?chat_id=${user.id}`).then(profileData => {
                    if (typeof updateProfileUI === 'function') updateProfileUI(profileData);
                    exitToMainMenu();
                });
            }, 1500);

        } else {
            showImageCard(`❌ Ошибка сохранения: ${data.error}`);
            setTimeout(renderImageWordsCheckboxes, 2500); // Возвращаем чекбоксы
        }
    })
    .catch(err => {
        showImageCard(`❌ Ошибка сети: ${err.message}`);
        setTimeout(renderImageWordsCheckboxes, 2500);
    });
}