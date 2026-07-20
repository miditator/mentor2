// ==========================================
// ФАЙЛ: frontend/js/grammar.js
// ==========================================

const grammarRulesDict = {
    en: {
        "A1 (Начальный)": [
            "To be (Present & Past)",
            "Present Simple",
            "Present Continuous",
            "Past Simple (Regular & Irregular)",
            "There is / There are",
            "Quantifiers (some/any, much/many)",
            "Pronouns (Subject, Object, Possessive)",
            "Modals: Can / Can't",
            "Comparative and Superlative Adjectives"
        ],
        "A2 (Элементарный)": [
            "Past Continuous",
            "Future: Will, Be going to, Present Continuous",
            "Present Perfect",
            "Present Perfect vs Past Simple",
            "Modals: Have to, Must, Should",
            "First Conditional & Time clauses",
            "Passive Voice (Present & Past Simple)",
            "Gerunds and Infinitives (Basics)"
        ],
        "B1 (Средний)": [
            "Present Perfect Continuous",
            "Past Perfect",
            "Future Continuous & Future Perfect",
            "Second & Third Conditionals",
            "Modals of Deduction (must/might/can't)",
            "Passive Voice (All tenses)",
            "Reported Speech",
            "Relative Clauses",
            "Used to / Would"
        ],
        "B2 (Выше среднего)": [
            "Mixed Conditionals",
            "Past Modals (should have / must have)",
            "Narrative Tenses (Past tenses combined)",
            "Passive (Advanced & Causative 'have')",
            "Wish / If only / I'd rather",
            "Articles (Advanced rules)",
            "So / Such / Too / Enough"
        ],
        "C1 (Продвинутый)": [
            "Inversion (Negative adverbials)",
            "Participle Clauses",
            "Cleft Sentences",
            "Advanced Conditionals (Inverted)",
            "Passive (Reporting verbs: It is said...)",
            "Nominalisation"
        ]
    },
    de: {
        "A1 (Начальный)": [
            "Präsens (Regelmäßige, unregelmäßige & trennbare Verben)",
            "Modalverben (können, müssen, wollen, dürfen)",
            "Nominativ und Akkusativ",
            "Possessivartikel",
            "Negation (nicht / kein)",
            "Fragesätze (W-Fragen & Ja/Nein-Fragen)",
            "Präpositionen mit Akkusativ (für, ohne, gegen)"
        ],
        "A2 (Элементарный)": [
            "Perfekt (mit haben & sein)",
            "Präteritum (nur sein, haben & Modalverben)",
            "Dativ & Präpositionen mit Dativ (aus, bei, mit, nach...)",
            "Wechselpräpositionen (Ort: Wo? vs. Wohin?)",
            "Nebensätze (weil, dass, wenn)",
            "Komparativ und Superlativ",
            "Reflexive Verben"
        ],
        "B1 (Средний)": [
            "Präteritum (alle Verben)",
            "Passiv Präsens & Präteritum",
            "Relativsätze",
            "Konjunktiv II (Wünsche, Ratschläge, Höflichkeit)",
            "Infinitiv mit zu & um...zu",
            "Genitiv",
            "N-Deklination",
            "Konjunktionen (obwohl, trotzdem, deshalb)"
        ],
        "B2 (Выше среднего)": [
            "Passiv (alle Zeiten & mit Modalverben)",
            "Konjunktiv II der Vergangenheit (Irreale Bedingungen)",
            "Zweiteilige Konnektoren (entweder...oder, weder...noch)",
            "Verben, Adjektive & Nomen mit festen Präpositionen",
            "Partizipialattribute (Partizip I & II als Adjektiv)",
            "Plusquamperfekt",
            "Relativsätze (mit Präpositionen & 'was/wo')"
        ],
        "C1 (Продвинутый)": [
            "Konjunktiv I (Indirekte Rede)",
            "Passiversatzformen (sich lassen, -bar, -fähig, sein zu)",
            "Nominalstil vs. Verbalstil",
            "Funktionsverbgefüge (z.B. eine Entscheidung treffen)",
            "Subjektive Bedeutung der Modalverben (Er soll krank sein)",
            "Erweiterte Partizipialattribute"
        ]
    }
};

// Изолированный стейт для тренировки грамматики
let grammarState = {
    rule: "",
    phrase: "",
    targetWord: "",
    helpClicks: 0
};

// 🎯 ОТРИСОВКА ГЛАВНОГО МЕНЮ ПРАВИЛ
function showGrammarMenu() {
    window.currentAppMode = 'grammar_menu';
    setAppHeader('📖 Правила', true);

    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const chatContainer = document.getElementById('chat-messages');
    const lang = window.userProfile?.language || 'en';
    const rulesList = grammarRulesDict[lang];

    let html = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; width: 100%; box-sizing: border-box;">
            <div style="font-size: 40px; margin-bottom: 10px;">📖</div>
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 5px;">Грамматика</div>
            <div style="font-size: 14px; color: var(--hint-color); margin-bottom: 20px; text-align: center;">Выбери правило для точечной тренировки</div>
    `;

    for (const [level, rules] of Object.entries(rulesList)) {
        html += `
            <div style="width: 100%; background: var(--bg-color); border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(112, 132, 153, 0.2); overflow: hidden;">
                <div style="background: rgba(112, 132, 153, 0.1); padding: 10px 15px; font-weight: bold; color: var(--text-color); font-size: 14px; border-bottom: 1px solid rgba(112, 132, 153, 0.1);">
                    ${level}
                </div>
                <div style="display: flex; flex-direction: column;">
        `;
        rules.forEach((rule, index) => {
            const borderBottom = index < rules.length - 1 ? 'border-bottom: 1px solid rgba(112, 132, 153, 0.1);' : '';
            html += `
                    <button onclick="startGrammarTraining('${rule}')" style="width: 100%; text-align: left; padding: 15px; background: transparent; border: none; ${borderBottom} color: var(--text-color); font-size: 15px; cursor: pointer; transition: background 0.2s;">
                        ${rule} <span style="float: right; color: var(--hint-color);">▶</span>
                    </button>
            `;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    chatContainer.innerHTML = html;
}

// 🎯 УНИВЕРСАЛЬНАЯ КАРТОЧКА ДЛЯ РЕЖИМА
function showGrammarCard(htmlContent, buttonsHtml = '') {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px; text-align: center;">
            <div style="width: 100%;">${htmlContent}</div>
            ${buttonsHtml}
        </div>`;
}

// 🎯 ЗАПУСК ТРЕНИРОВКИ КОНКРЕТНОГО ПРАВИЛА
function startGrammarTraining(rule) {
    window.currentAppMode = 'grammar_training';
    grammarState.rule = rule;
    grammarState.helpClicks = 0;

    // 🔥 Меняем шапку, чтобы было видно, какое правило тренируем
    setAppHeader(`Тренировка: ${rule}`, true);

    document.getElementById('input-container').style.display = 'flex';
    document.getElementById('text-input-row').style.display = 'flex';
    document.getElementById('user-input').value = '';
    document.getElementById('user-input').placeholder = "Напиши перевод...";

    showGrammarCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ составляет предложение по правилу <br><b>${rule}</b>...</div>
    `);

    // 🔥 Вызываем новый изолированный эндпоинт
    apiFetch(`/grammar/new?chat_id=${user.id}&rule=${encodeURIComponent(rule)}`)
        .then(data => {
            if (window.currentAppMode !== 'grammar_training') return; // Охранник

            if (data.success) {
                grammarState.phrase = data.phrase;
                grammarState.targetWord = data.target_word;

                const langName = window.userProfile?.language === 'de' ? 'немецкий' : 'английский';

                let buttons = `
                    <div style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">
                        <button onclick="showGrammarHelp()" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">💡 Подсказка</button>
                        <button onclick="startGrammarTraining('${rule}')" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">🔄 Другая фраза</button>
                    </div>
                `;

                showGrammarCard(`
                    <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Переведи на ${langName}:</div>
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${data.phrase}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 14px; color: var(--text-color); background: rgba(112, 132, 153, 0.1); padding: 10px; border-radius: 8px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box;">
                            <b>📌 Слово:</b> ${grammarState.targetWord}
                        </div>
                    </div>
                `, buttons);
                document.getElementById('user-input').focus();
            } else {
                showGrammarCard(`<div style="font-size: 40px; margin-bottom: 10px;">❌</div><div>Ошибка: ${data.error}</div>`);
            }
        }).catch(err => {
            showGrammarCard(`<div style="font-size: 40px; margin-bottom: 10px;">⚠️</div><div>Ошибка сети.</div>`);
        });
}

// 🎯 ОБРАБОТКА ВВОДА ПОЛЬЗОВАТЕЛЯ
function handleGrammarInput(text) {
    showGrammarCard(`
        <div style="font-size: 40px; margin-bottom: 15px;">🤖</div>
        <div style="font-size: 16px; color: var(--hint-color);">ИИ проверяет грамматику...</div>
    `);
    document.getElementById('text-input-row').style.display = 'none';

    // Передаем саму фразу, чтобы бэкенду не нужно было хранить её в БД
    apiFetch('/grammar/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, original_phrase: grammarState.phrase, answer: text, rule: grammarState.rule })
    }).then(data => {
        if (window.currentAppMode !== 'grammar_training') return;

        if (data.success) {
            let btnNext = `<button onclick="startGrammarTraining('${grammarState.rule}')" class="btn-primary" style="margin-top: 15px;">🔄 Следующая фраза</button>`;
            let statusIcon = data.is_correct ? "✅" : "❌";
            let statusColor = data.is_correct ? "#34c759" : "#ff3b30";

            showGrammarCard(`
                <div style="font-size: 13px; color: var(--hint-color); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Задание:</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">${grammarState.phrase}</div>
                <div style="font-size: 50px; margin-bottom: 15px;">${statusIcon}</div>
                <div style="background: rgba(112, 132, 153, 0.05); padding: 15px; border-radius: 12px; border-left: 4px solid ${statusColor}; text-align: left; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                </div>
            `, btnNext);
        } else {
            showGrammarCard(`<div>❌ Ошибка: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showGrammarCard(`<div>⚠️ Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

// 🎯 ПОДСКАЗКА
function showGrammarHelp() {
    grammarState.helpClicks++;
    let step = grammarState.helpClicks;

    showGrammarCard(`
        <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 20px;">${grammarState.phrase}</div>
        <div style="text-align: center; color: var(--hint-color);"><span style="font-size: 24px;">🤖</span><br>ИИ готовит ${step === 1 ? 'подсказку' : 'ответ'}...</div>
    `);
    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/grammar/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, original_phrase: grammarState.phrase, step: step })
    }).then(data => {
        if (window.currentAppMode !== 'grammar_training') return;

        if (data.success) {
            if (step === 1) {
                let buttons = `
                    <div style="display: flex; gap: 10px; width: 100%; margin-top: 15px;">
                        <button onclick="showGrammarHelp()" style="flex: 1; padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: 10px; color: #ff3b30; font-size: 14px; border: 1px solid rgba(255, 59, 48, 0.2); cursor: pointer;">🆘 Сдаюсь</button>
                        <button onclick="startGrammarTraining('${grammarState.rule}')" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border-radius: 10px; color: var(--text-color); font-size: 14px; border: 1px solid rgba(112, 132, 153, 0.2); cursor: pointer;">🔄 Другая фраза</button>
                    </div>
                `;
                showGrammarCard(`
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${grammarState.phrase}</div>
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 15px; border-radius: 12px; text-align: left; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #ff9f0a; margin-bottom: 8px;">💡 Подсказка:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                `, buttons);
                document.getElementById('text-input-row').style.display = 'flex';
                document.getElementById('user-input').focus();
            } else {
                let btnNext = `<button onclick="startGrammarTraining('${grammarState.rule}')" class="btn-primary" style="margin-top: 15px;">🔄 Следующая фраза</button>`;
                showGrammarCard(`
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-color); margin-bottom: 15px;">${grammarState.phrase}</div>
                    <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 15px; border-radius: 12px; text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 16px; font-weight: bold; color: #34c759; margin-bottom: 8px;">📖 Правильный ответ:</div>
                        <div style="font-size: 15px; color: var(--text-color); line-height: 1.5;">${data.feedback}</div>
                    </div>
                `, btnNext);
            }
        }
    });
}