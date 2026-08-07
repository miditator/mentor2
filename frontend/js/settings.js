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

    // 🔥 Получаем текущего провайдера
    const currentProvider = window.userProfile?.ai_provider || 'groq';

    // 🔥 ДОБАВЛЕНО: Функция-помощник для стилей кнопок (ее не хватало!)
    const getBtnStyle = (providerId, activeColor) => {
        if (currentProvider === providerId) {
            return `border: 1px solid ${activeColor}; color: ${activeColor}; background: ${activeColor.replace('1)', '0.1)')};`;
        }
        return 'border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-color); background: rgba(255, 255, 255, 0.04);';
    };

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; box-sizing: border-box; width: 100%;">
            
            <div style="font-size: 36px; margin-bottom: 10px;">⚙️</div>
            <div style="font-size: 20px; color: var(--text-color); margin-bottom: 20px;">Настройки</div>
            
            <div onclick="showLanguageSelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 12px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Изучаемый язык</span>
                    <span style="color: var(--text-color); font-size: 15px;">${currentLang}</span>
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
                    <span style="color: var(--text-color); font-size: 15px;">${currentDiff}</span>
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
                    <span style="color: var(--text-color); font-size: 15px;">${currentWords} слов</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">📚</span>
            </div>

            <div onclick="showPhrasesGoalSelector()" 
                 style="width: 100%; background: rgba(255, 255, 255, 0.04); padding: 15px 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 20px; cursor: pointer; transition: 0.2s; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.12)';"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.06)';"
                 onmousedown="this.style.transform='scale(0.98)'"
                 onmouseup="this.style.transform='scale(1)'"
                 onmouseleave="this.style.transform='scale(1)'">
                <div>
                    <span style="color: var(--hint-color); font-size: 12px; display: block; margin-bottom: 2px;">Цель по фразам в день</span>
                    <span style="color: var(--text-color); font-size: 15px;">${currentPhrases} фраз</span>
                </div>
                <span style="color: var(--hint-color); font-size: 16px;">✍️</span>
            </div>

            <!-- 🔥 ОБНОВЛЕННЫЙ БЛОК ВЫБОРА НЕЙРОСЕТИ 🔥 -->
            <div style="width: 100%; background: rgba(255, 255, 255, 0.02); padding: 18px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); box-sizing: border-box; text-align: left;">
                <div style="font-size: 15px; color: #ffffff; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🧠</span> Выбор нейросети
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                    <button onclick="changeAiProvider('groq')" class="btn-glass" style="flex: 1 1 calc(50% - 5px); height: 42px; font-size: 13px; padding: 0 5px; ${getBtnStyle('groq', 'rgba(14, 165, 233, 1)')}">
                        Groq (Llama)
                    </button>
                    <button onclick="changeAiProvider('gemini')" class="btn-glass" style="flex: 1 1 calc(50% - 5px); height: 42px; font-size: 13px; padding: 0 5px; ${getBtnStyle('gemini', 'rgba(52, 199, 89, 1)')}">
                        Gemini 2.5
                    </button>
                    <button onclick="changeAiProvider('oss_120b')" class="btn-glass" style="flex: 1 1 100%; height: 42px; font-size: 13px; padding: 0 5px; ${getBtnStyle('oss_120b', 'rgba(168, 129, 243, 1)')}">
                        OSS 120B
                    </button>
                </div>
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
                
                <!-- 🔥 КНОПКА НАЗАД В НАСТРОЙКИ -->
                <button onclick="renderSettingsMenu()" class="btn-glass btn-glass-neutral" style="margin-top: 15px; height: 46px; font-size: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M15 18l-6-6 6-6"/></svg>
                    Назад к настройкам
                </button>
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
                
                <!-- 🔥 КНОПКА НАЗАД В НАСТРОЙКИ -->
                <button onclick="renderSettingsMenu()" class="btn-glass btn-glass-neutral" style="margin-top: 15px; height: 46px; font-size: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M15 18l-6-6 6-6"/></svg>
                    Назад к настройкам
                </button>
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
                
                <!-- 🔥 КНОПКА НАЗАД В НАСТРОЙКИ -->
                <button onclick="renderSettingsMenu()" class="btn-glass btn-glass-neutral" style="margin-top: 15px; height: 46px; font-size: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M15 18l-6-6 6-6"/></svg>
                    Назад к настройкам
                </button>
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
                
                <!-- 🔥 КНОПКА НАЗАД В НАСТРОЙКИ -->
                <button onclick="renderSettingsMenu()" class="btn-glass btn-glass-neutral" style="margin-top: 15px; height: 46px; font-size: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M15 18l-6-6 6-6"/></svg>
                    Назад к настройкам
                </button>
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

// ==========================================
// 🔥 СМЕНА ИИ-ПРОВАЙДЕРА В НАСТРОЙКАХ
// ==========================================
function changeAiProvider(provider) {
    apiFetch('/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            setting_key: 'ai_provider',
            setting_value: provider
        })
    }).then(data => {
        if (data.success) {
            // Сохраняем локально, чтобы профиль обновился мгновенно
            if (window.userProfile) {
                window.userProfile.ai_provider = provider;
            }

            // Если мы находимся в настройках, просто перерисовываем меню,
            // чтобы стили активной кнопки применились автоматически
            if (window.currentAppMode === 'settings') {
                renderSettingsMenu();
            } else {
                // Если мы кликнули с экрана исчерпания лимитов, возвращаемся в меню
                const inputContainer = document.getElementById('input-container');
                if (inputContainer && inputContainer.style.display === 'none') {
                    exitToMainMenu();
                }
            }
        } else {
            alert('❌ Ошибка при смене нейросети');
        }
    }).catch(err => console.error("Ошибка смены ИИ:", err));
}

// ==========================================
// 🔥 ОТЛАДКА: ПРОВЕРКА ТЕКУЩЕЙ НЕЙРОСЕТИ
// ==========================================
function testAiIdentity() {
    console.log("🕵️ Отправляю запрос для проверки ИИ-модели...");
    alert("⏳ Запрос отправлен. ИИ думает...");

    apiFetch('/debug/ai_identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id })
    }).then(data => {
        if (data.success) {
            // Вывод в консоль для разработчика
            console.log("✅ ОТВЕТ НЕЙРОСЕТИ:", data.identity);

            // Вывод на экран для удобства на телефоне
            alert("🤖 Ответ ИИ:\n\n" + data.identity);
        } else {
            console.error("❌ Ошибка ИИ:", data.error);
            alert("Ошибка: " + data.error);
        }
    }).catch(err => {
        console.error("Ошибка сети:", err);
        alert("Ошибка сети!");
    });
}