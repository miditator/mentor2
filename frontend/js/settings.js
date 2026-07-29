// ==========================================
// ФАЙЛ: frontend/js/settings.js
// ==========================================

function showSettingsMode() {
    window.currentAppMode = 'settings';
    setAppHeader('⚙️ Настройки', true);

    document.getElementById('mini-profile').style.display = 'none';
    document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('dictionary-keyboard')) document.getElementById('dictionary-keyboard').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    renderSettingsMenu();
}

function renderSettingsMenu() {
    const chatContainer = document.getElementById('chat-messages');

    const diffMap = { "A1": "Начальный (A1)", "A2": "Элементарный (A2)", "B1": "Средний (B1)", "B2": "Выше среднего (B2)", "C1": "Продвинутый (C1)" };
    const langMap = { "en": "Английский 🇬🇧", "de": "Немецкий 🇩🇪" };

    const currentLang = langMap[window.userProfile?.language] || "Не задан";
    const currentDiff = diffMap[window.userProfile?.difficulty] || "Не задана";
    const currentWords = window.userProfile?.words_per_day || 5;
    const currentPhrases = window.userProfile?.phrases_per_day || 10;

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            
            <div style="font-size: 36px; margin-bottom: 10px;">⚙️</div>
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">Настройки</div>
            
            <div onclick="showLanguageSelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 12px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Изучаемый язык</span>
                    <span style="color: var(--text-color); font-weight: 600; font-size: 15px;">${currentLang}</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">🌍</span>
            </div>

            <div onclick="showDifficultySelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 12px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Текущий уровень</span>
                    <span style="color: var(--text-color); font-weight: 600; font-size: 15px;">${currentDiff}</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">📈</span>
            </div>

            <div onclick="showWordsGoalSelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 12px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Цель по словам в день</span>
                    <span style="color: var(--text-color); font-weight: 600; font-size: 15px;">${currentWords} слов</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">📚</span>
            </div>

            <div onclick="showPhrasesGoalSelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 5px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Цель по фразам в день</span>
                    <span style="color: var(--text-color); font-weight: 600; font-size: 15px;">${currentPhrases} фраз</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">✍️</span>
            </div>

        </div>
    `;
}

function showLanguageSelector() {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">Выбери язык обучения</div>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button onclick="saveSetting('source_lang', 'en')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;">🇬🇧 Английский язык</button>
                <button onclick="saveSetting('source_lang', 'de')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;">🇩🇪 Немецкий язык</button>
            </div>
        </div>
    `;
}

function showDifficultySelector() {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">Выбери новый уровень</div>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button onclick="saveSetting('difficulty', 'A1')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">🟢 Начальный (A1)</button>
                <button onclick="saveSetting('difficulty', 'A2')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">🟢 Элементарный (A2)</button>
                <button onclick="saveSetting('difficulty', 'B1')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">🟡 Средний (B1)</button>
                <button onclick="saveSetting('difficulty', 'B2')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">🟡 Выше среднего (B2)</button>
                <button onclick="saveSetting('difficulty', 'C1')" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">🔴 Продвинутый (C1)</button>
            </div>
        </div>
    `;
}

function showWordsGoalSelector() {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">Слов в день</div>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button onclick="saveSetting('words_per_day', 3)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">3 слова</button>
                <button onclick="saveSetting('words_per_day', 5)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">5 слов (Рекомендуемо)</button>
                <button onclick="saveSetting('words_per_day', 10)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">10 слов</button>
                <button onclick="saveSetting('words_per_day', 15)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">15 слов</button>
                <button onclick="saveSetting('words_per_day', 20)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">20 слов</button>
            </div>
        </div>
    `;
}

function showPhrasesGoalSelector() {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">Фраз в день</div>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button onclick="saveSetting('phrases_per_day', 5)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">5 фраз</button>
                <button onclick="saveSetting('phrases_per_day', 10)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">10 фраз (Рекомендуемо)</button>
                <button onclick="saveSetting('phrases_per_day', 15)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">15 фраз</button>
                <button onclick="saveSetting('phrases_per_day', 20)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">20 фраз</button>
                <button onclick="saveSetting('phrases_per_day', 30)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">30 фраз</button>
            </div>
        </div>
    `;
}

function saveSetting(key, value) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 30px 20px; margin-top: 5px; width: 100%; box-sizing: border-box; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">⏳</div>
            <div style="font-size: 15px; color: var(--hint-color);">Сохраняем изменения...</div>
        </div>
    `;

    apiFetch('/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, setting_key: key, setting_value: String(value) })
    }).then(data => {
        if(data.success) {
            apiFetch(`/profile?chat_id=${user.id}`).then(profileData => {
                if (!profileData.is_new_user) {
                    updateProfileUI(profileData);
                }
                renderSettingsMenu();
            }).catch(err => {
                console.error("Ошибка при обновлении профиля:", err);
                renderSettingsMenu();
            });
        } else {
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: #ff3b30;">❌ Ошибка: ${data.error}</div>`;
            setTimeout(renderSettingsMenu, 2000);
        }
    }).catch(err => {
        chatContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: #ff3b30;">⚠️ Ошибка сети.</div>`;
        setTimeout(renderSettingsMenu, 2000);
    });
}