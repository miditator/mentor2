// ==========================================
// ФАЙЛ: frontend/js/add_word.js
// ==========================================

let isWaitingForAi = false;
let pendingForeignWord = "";
let pendingRuWord = "";
let isQuickTranslation = false; // 🔥 Флажок для авто-возврата

function showAddCard(htmlContent) {
    const chatContainer = document.getElementById('chat-messages');
    // 🔥 Очистили функцию от часиков. Теперь это просто аккуратный контейнер-карточка
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; text-align: center; width: 100%; box-sizing: border-box;">
            ${htmlContent}
        </div>`;
}

function enterAddWordMode(isQuick = false) {
    window.currentAppMode = 'add_word';
    isWaitingForAi = false;
    isQuickTranslation = isQuick;

    setAppHeader('➕ Добавление слова', true);

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';

    document.getElementById('input-container').style.display = 'flex';
    showTextInput();

    const langName = window.userProfile?.language === 'de' ? 'немецком' : 'английском';

    showAddCard(`
        <div style="font-size: 50px; margin-bottom: 15px;">✍️</div>
        <div style="font-size: 22px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Новое слово</div>
        <div style="font-size: 14px; color: var(--hint-color);">Напиши слово на <b>${langName}</b> или <b>русском</b> языке, а ИИ найдет его перевод.</div>
    `);

    document.getElementById('user-input').focus();
}

function showTextInput() { document.getElementById('text-input-row').style.display = 'flex'; }
function hideTextInput() { document.getElementById('text-input-row').style.display = 'none'; }

function handleAddWordInput(text) {
    if (isWaitingForAi) return;
    isWaitingForAi = true;

    // 🔥 1. Показываем часики ТОЛЬКО во время перевода
    showAddCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ переводит...</div>
    `);

    apiFetch('/words/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, foreign: text })
    })
    .then(data => {
        isWaitingForAi = false;

        if (data.success) {
            pendingForeignWord = data.original;

            let translationText = data.translation || "";
            let parts = translationText.split('~~~');
            let meaningsPart = parts[0] ? parts[0].trim() : "";
            let examplesPart = parts[1] ? parts[1].trim() : "";

            let meanings = meaningsPart.split('|').map(s => s.trim()).filter(s => s.length > 0);
            let examples = examplesPart.split('|').map(s => s.trim()).filter(s => s.length > 0);

            let typoNotice = "";
            if (data.is_typo) {
                typoNotice = `
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); color: #ff9f0a; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                        ✨ <b>ИИ исправил опечатку!</b>
                    </div>
                `;
            }

            let checkboxesHtml = meanings.map((m, index) => `
                <label style="display: flex; align-items: center; justify-content: flex-start; width: 100%; background: rgba(112, 132, 153, 0.05); padding: 12px 15px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; border: 1px solid rgba(112, 132, 153, 0.2); box-sizing: border-box; transition: 0.2s;">
                    <input type="checkbox" value="${m}" checked style="width: 18px; height: 18px; margin-right: 15px; accent-color: var(--button-color); cursor: pointer; flex-shrink: 0;">
                    <span style="font-size: 15px; color: var(--text-color); font-weight: 500; text-align: left;">${index + 1}. ${m}</span>
                </label>
            `).join('');

            let examplesHtml = "";
            if (examples.length > 0) {
                examplesHtml = `
                    <div style="width: 100%; margin-bottom: 20px; text-align: left; background: rgba(112, 132, 153, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(112, 132, 153, 0.2); box-sizing: border-box;">
                        <div style="font-size: 12px; font-weight: bold; color: var(--hint-color); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px;">💡 Примеры использования:</div>
                        ${examples.map(ex => `<div style="font-size: 14px; color: var(--text-color); margin-bottom: 8px; padding-left: 10px; border-left: 3px solid var(--button-color); line-height: 1.4;">${ex}</div>`).join('')}
                    </div>
                `;
            }

            let rejectBtnText = isQuickTranslation ? "❌ Отмена" : "🔄 Дальше";

            // 🔥 2. Финальная карточка: Добавлена кнопка озвучки (динамик) рядом со словом!
            showAddCard(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                    ${typoNotice}
                    <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Значения:</div>
                    
                    <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="font-size: 26px; font-weight: bold; color: var(--text-color);">
                            ${pendingForeignWord}
                        </div>
                        <button onclick="speakWord('${pendingForeignWord}', '${window.userProfile?.language || 'en'}')" style="background: rgba(112, 132, 153, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                            🔊
                        </button>
                    </div>
                    
                    <div id="meanings-container" style="width: 100%; display: flex; flex-direction: column; margin-bottom: ${examples.length > 0 ? '10px' : '20px'};">
                        ${checkboxesHtml}
                    </div>
                    
                    ${examplesHtml}
                    
                    <div style="display: flex; gap: 10px; width: 100%;">
                        <button onclick="confirmAddWord()" style="flex: 1; padding: 14px; background: #34c759; border: none; border-radius: 12px; color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">✅ Сохранить</button>
                        <button onclick="rejectAddWord()" style="flex: 1; padding: 14px; background: rgba(112, 132, 153, 0.1); border: 1px solid rgba(112, 132, 153, 0.2); border-radius: 12px; color: var(--text-color); font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">${rejectBtnText}</button>
                    </div>
                </div>
            `);
            hideTextInput();

        } else if (data.error === "nonsense") {
            showAddCard(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center;">
                    <div style="font-size: 50px; margin-bottom: 15px;">🤨</div>
                    <div style="font-size: 20px; font-weight: bold; color: #ff3b30; margin-bottom: 10px;">Эмм... Что это?</div>
                    <div style="font-size: 14px; color: var(--hint-color); margin-bottom: 25px; line-height: 1.4;">
                        Кажется, это белиберда или опечатка. ИИ не смог перевести "<b>${text}</b>".
                    </div>
                    <div style="font-size: 14px; color: var(--button-color);">Введи нормальное слово 👇</div>
                </div>
            `);
            showTextInput();
            document.getElementById('user-input').value = '';
            document.getElementById('user-input').focus();
        } else {
            showAddCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка: ${data.error}</div>`);
            showTextInput();
        }
    })
    .catch(err => {
        isWaitingForAi = false;
        showAddCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети: ${err.message}</div>`);
        showTextInput();
    });
}

function rejectAddWord() {
    if (isQuickTranslation) {
        exitAddWordMode();
        return;
    }

    showAddCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">🔄</div>
        <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Пропущено</div>
        <div style="font-size: 14px; color: var(--hint-color);">Введи другое слово 👇</div>
    `);
    showTextInput();
    document.getElementById('user-input').value = '';
    document.getElementById('user-input').focus();
}

function confirmAddWord() {
    const checkedBoxes = document.querySelectorAll('#meanings-container input[type="checkbox"]:checked');

    if (checkedBoxes.length === 0) {
        alert("Пожалуйста, выбери хотя бы одно значение для сохранения!");
        return;
    }

    pendingRuWord = Array.from(checkedBoxes).map(cb => cb.value).join(', ');

    showAddCard(`<div style="font-size: 40px; margin-bottom: 15px;">💾</div><div style="color: var(--hint-color);">Сохраняем...</div>`);
    hideTextInput();

    apiFetch('/words/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, foreign: pendingForeignWord, ru: pendingRuWord })
    })
    .then(data => {
        if(data.success) {
            let nextStepText = isQuickTranslation ? "Возвращаемся в меню... ⏳" : "Введи следующее слово 👇";

            showAddCard(`
                <div style="font-size: 60px; margin-bottom: 10px;">✅</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 5px;">Добавлено!</div>
                <div style="font-size: 16px; color: var(--button-color); margin-bottom: 25px; word-wrap: break-word; text-align: center;">${pendingForeignWord} — ${pendingRuWord}</div>
                <div style="font-size: 14px; color: var(--hint-color);">${nextStepText}</div>
            `);

            if (isQuickTranslation) {
                setTimeout(() => {
                    exitAddWordMode();
                }, 1200);
            } else {
                showTextInput();
                document.getElementById('user-input').value = '';
                document.getElementById('user-input').focus();
            }
        } else {
            showAddCard(`❌ Ошибка сохранения: ${data.error}`);
            showTextInput();
            document.getElementById('user-input').focus();
        }
    })
    .catch(err => {
        showAddCard(`❌ Ошибка сети: ${err.message}`);
        showTextInput();
        document.getElementById('user-input').focus();
    });
}

function exitAddWordMode() {
    isWaitingForAi = false;
    document.getElementById('user-input').value = '';
    exitToMainMenu();
    if (user && user.id) {
        apiFetch(`/profile?chat_id=${user.id}`).then(profileData => {
            if (typeof updateProfileUI === 'function') updateProfileUI(profileData);
        });
    }
}