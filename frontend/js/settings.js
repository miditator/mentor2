// ==========================================
// ФАЙЛ: frontend/js/settings.js
// ==========================================

const VOICES_EN = {
    "en-US-JennyNeural": "Jenny (США, 👩)",
    "en-US-AriaNeural": "Aria (США, 👩)",
    "en-US-GuyNeural": "Guy (США, 👨)",
    "en-US-ChristopherNeural": "Chris (США, 👨)",
    "en-GB-SoniaNeural": "Sonia (Брит, 👩)",
    "en-GB-RyanNeural": "Ryan (Брит, 👨)"
};

const VOICES_DE = {
    "de-DE-AmalaNeural": "Amala (👩)",
    "de-DE-KatjaNeural": "Katja (👩)",
    "de-DE-ConradNeural": "Conrad (👨)",
    "de-DE-KillianNeural": "Killian (👨)",
    "de-AT-IngridNeural": "Ingrid (Австрия, 👩)"
};

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
    window.currentAppMode = 'settings';
    const chatContainer = document.getElementById('chat-messages');

    const diffMap = { "A1": "Начальный (A1)", "A2": "Элементарный (A2)", "B1": "Средний (B1)", "B2": "Выше среднего (B2)", "C1": "Продвинутый (C1)" };
    const langMap = { "en": "Английский 🇬🇧", "de": "Немецкий 🇩🇪" };
    const rateMap = { "-25%": "Очень медленно 🐢", "-15%": "Медленно 🚶", "0%": "Нормально 🏃", "+10%": "Быстро 🚀" };

    const langCode = window.userProfile?.language || 'en';
    const currentLang = langMap[langCode] || "Не задан";
    const currentDiff = diffMap[window.userProfile?.difficulty] || "Не задана";
    const currentWords = window.userProfile?.words_per_day || 5;
    const currentPhrases = window.userProfile?.phrases_per_day || 10;
    const currentRateId = window.userProfile?.tts_rate || "-15%";
    const currentRateName = rateMap[currentRateId] || "Медленно 🚶";

    const voiceKey = langCode === 'de' ? 'tts_voice_de' : 'tts_voice_en';
    const currentVoiceId = window.userProfile?.[voiceKey];

    let currentVoiceName = "По умолчанию";
    if (langCode === 'de' && VOICES_DE[currentVoiceId]) currentVoiceName = VOICES_DE[currentVoiceId];
    else if (langCode === 'en' && VOICES_EN[currentVoiceId]) currentVoiceName = VOICES_EN[currentVoiceId];

    const currentProvider = window.userProfile?.ai_provider || 'gemini';
    const providerBtnClass = currentProvider === 'gemini' ? 'btn-glass-green' : 'btn-glass-secondary';

    chatContainer.innerHTML = `
        <div class="card" style="padding: 20px 16px; margin-top: 10px;">
            <div class="convex-icon" style="width: 48px; height: 48px; margin: 0 auto 12px; font-size: 22px;">⚙️</div>
            <div style="font-size: 16px; margin-bottom: 20px;">Параметры обучения</div>
            
            <div onclick="showLanguageSelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Изучаемый язык</span>
                    <span style="font-size: 14px;">${currentLang}</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">🌍</div>
            </div>

            <div onclick="showDifficultySelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Текущий уровень</span>
                    <span style="font-size: 14px;">${currentDiff}</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">📈</div>
            </div>

            <div onclick="showWordsGoalSelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Цель по словам в день</span>
                    <span style="font-size: 14px;">${currentWords} слов</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">📚</div>
            </div>

            <div onclick="showPhrasesGoalSelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 16px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Цель по фразам в день</span>
                    <span style="font-size: 14px;">${currentPhrases} фраз</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">✍️</div>
            </div>
            
            <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.05); margin-bottom: 16px;"></div>
            
            <div onclick="showVoiceSelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Голос озвучки (${langCode.toUpperCase()})</span>
                    <span style="font-size: 14px;">${currentVoiceName}</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">🗣️</div>
            </div>
            
            <div onclick="showSpeechRateSelector()" class="word-checkbox-label" style="justify-content: space-between; padding: 12px 14px; margin-bottom: 20px;">
                <div style="text-align: left;">
                    <span style="color: var(--hint-color); font-size: 11px; display: block; margin-bottom: 2px;">Скорость речи</span>
                    <span style="font-size: 14px;">${currentRateName}</span>
                </div>
                <div class="convex-icon" style="width: 30px; height: 30px; font-size: 14px;">⏱️</div>
            </div>

            <div style="width: 100%; text-align: left; background: rgba(0,0,0,0.15); padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 14px;">🧠</span> Провайдер ИИ
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="changeAiProvider('gemini')" class="btn-glass ${providerBtnClass}" style="height: 40px; font-size: 13px; font-weight: normal;">
                        Gemini 3.5-flash-lite
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showLanguageSelector() {
    window.currentAppMode = 'settings_sub';
    const currentLang = window.userProfile?.language || 'en';

    const options = [
        {id: 'en', label: '🇬🇧 Английский язык'},
        {id: 'de', label: '🇩🇪 Немецкий язык'}
    ];

    renderSubMenu("🌍", "Выбери язык обучения", "source_lang", options, currentLang);
}

function showDifficultySelector() {
    window.currentAppMode = 'settings_sub';
    const currentDiff = window.userProfile?.difficulty || "A1";

    const options = [
        {id: 'A1', label: '🟢 Начальный (A1)'},
        {id: 'A2', label: '🟢 Элементарный (A2)'},
        {id: 'B1', label: '🟡 Средний (B1)'},
        {id: 'B2', label: '🟡 Выше среднего (B2)'},
        {id: 'C1', label: '🔴 Продвинутый (C1)'}
    ];

    renderSubMenu("📈", "Уровень владения", "difficulty", options, currentDiff);
}

function showWordsGoalSelector() {
    window.currentAppMode = 'settings_sub';
    const currentWords = window.userProfile?.words_per_day || 5;

    const options = [
        {id: 3, label: '3 слова'},
        {id: 5, label: '5 слов (Рекомендуемо)'},
        {id: 10, label: '10 слов'},
        {id: 15, label: '15 слов'},
        {id: 20, label: '20 слов'}
    ];

    renderSubMenu("📚", "Цель по словам", "words_per_day", options, currentWords);
}

function showPhrasesGoalSelector() {
    window.currentAppMode = 'settings_sub';
    const currentPhrases = window.userProfile?.phrases_per_day || 10;

    const options = [
        {id: 5, label: '5 фраз'},
        {id: 10, label: '10 фраз (Рекомендуемо)'},
        {id: 15, label: '15 фраз'},
        {id: 20, label: '20 фраз'},
        {id: 30, label: '30 фраз'}
    ];

    renderSubMenu("✍️", "Цель по фразам", "phrases_per_day", options, currentPhrases);
}

function showSpeechRateSelector() {
    window.currentAppMode = 'settings_sub';
    const currentRate = window.userProfile?.tts_rate || "-15%";

    const options = [
        {id: '-25%', label: '🐢 Очень медленно'},
        {id: '-15%', label: '🚶 Медленно (Реком.)'},
        {id: '0%', label: '🏃 Нормально (Беглая речь)'},
        {id: '+10%', label: '🚀 Быстро'}
    ];

    renderSubMenu("⏱️", "Скорость произношения", "tts_rate", options, currentRate);
}

function showVoiceSelector() {
    window.currentAppMode = 'settings_sub';
    const langCode = window.userProfile?.language || 'en';

    const voices = langCode === 'de' ? VOICES_DE : VOICES_EN;
    const settingKey = langCode === 'de' ? 'tts_voice_de' : 'tts_voice_en';
    const currentVoiceId = window.userProfile?.[settingKey];

    const options = Object.entries(voices).map(([id, label]) => ({ id, label }));

    renderSubMenu("🗣️", "Голос озвучки", settingKey, options, currentVoiceId, `Для заданий на ${langCode === 'de' ? 'немецком' : 'английском'} языке.`);
}

function renderSubMenu(icon, title, settingKey, optionsArray, currentValue, subtitle = "") {
    const chatContainer = document.getElementById('chat-messages');

    let buttonsHtml = optionsArray.map(opt => {
        const isSelected = opt.id == currentValue;
        const btnClass = isSelected ? 'btn-glass btn-glass-green' : 'btn-glass btn-glass-secondary';
        const checkIcon = isSelected ? '✓ ' : '';

        return `
            <button onclick="saveSetting('${settingKey}', '${opt.id}')" class="${btnClass}" style="justify-content: flex-start; padding-left: 18px; font-size: 14px; font-weight: normal; height: 44px;">
                ${checkIcon}${opt.label}
            </button>
        `;
    }).join('');

    const subtitleHtml = subtitle ? `<div style="font-size: 12px; color: var(--hint-color); margin-bottom: 16px; text-align: center;">${subtitle}</div>` : '';

    chatContainer.innerHTML = `
        <div class="card" style="padding: 20px 16px; margin-top: 10px;">
            <div class="convex-icon" style="width: 48px; height: 48px; margin: 0 auto 12px; font-size: 24px;">${icon}</div>
            <div style="font-size: 16px; margin-bottom: ${subtitle ? '6px' : '20px'};">${title}</div>
            ${subtitleHtml}
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                ${buttonsHtml}
            </div>
        </div>
    `;
}

function saveSetting(key, value) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div class="card" style="padding: 30px 20px; margin-top: 10px;">
            <div class="convex-icon" style="width: 50px; height: 50px; margin: 0 auto 12px; font-size: 24px; animation: pulse-mic 1.5s infinite;">⏳</div>
            <div style="font-size: 14px; color: var(--hint-color);">Сохраняем...</div>
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
            chatContainer.innerHTML = `<div class="card" style="color: #ff3b30; font-size: 14px;">❌ Ошибка: ${data.error}</div>`;
            setTimeout(renderSettingsMenu, 2000);
        }
    }).catch(err => {
        chatContainer.innerHTML = `<div class="card" style="color: #ff3b30; font-size: 14px;">⚠️ Ошибка сети.</div>`;
        setTimeout(renderSettingsMenu, 2000);
    });
}

function changeAiProvider(provider) {
    apiFetch('/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, setting_key: 'ai_provider', setting_value: provider })
    }).then(data => {
        if (data.success) {
            if (window.userProfile) window.userProfile.ai_provider = provider;
            if (window.currentAppMode === 'settings') renderSettingsMenu();
            else {
                const inputContainer = document.getElementById('input-container');
                if (inputContainer && inputContainer.style.display === 'none') exitToMainMenu();
            }
        } else {
            alert('❌ Ошибка при смене нейросети');
        }
    }).catch(err => console.error("Ошибка смены ИИ:", err));
}