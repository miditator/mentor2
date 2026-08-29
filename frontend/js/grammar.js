// ==========================================
// ФАЙЛ: frontend/js/grammar.js
// ==========================================

const grammarRulesDict = {
    en: {
        "A1": [
            "Present simple forms of 'to be': am/is/are",
            "This, that, these, those",
            "Possessive adjectives and subject pronouns (I/my, you/your, etc.)",
            "A/an, plurals: Singular and plural forms",
            "Adjectives",
            "Present simple: I do, I don't, Do I?",
            "Questions: Word order and question words",
            "Adverbs of frequency with present simple",
            "Object pronouns vs subject pronouns: Me or I, she or her?",
            "Whose, possessive 's: Whose is this? It's Mike's",
            "At, in, on: Prepositions of time",
            "At, in, on: Prepositions of place",
            "Can, can't: Ability, possibility, permission",
            "Present continuous: I'm doing, I'm not doing, Are you doing?",
            "Present simple or present continuous?",
            "The imperative: Sit down! Don’t talk!",
            "Was/were: Past simple of 'be'",
            "Past simple: Regular/irregular verbs",
            "Past simple: Negatives and questions",
            "Verbs + to + infinitive and verbs + -ing",
            "Would you like...? I'd like...",
            "Have got",
            "A, some, any: Countable and uncountable nouns",
            "There is, there are / there was, there were",
            "There or It",
            "Next to, under, between, in front of, behind, over, etc.",
            "Much, many, a lot of, a little, a few",
            "Comparative adjectives: Older than, more important than, etc.",
            "Superlative adjectives: The oldest, the most important, etc.",
            "'Will' and 'shall': Future",
            "Be going to: Plans and predictions",
            "Adverbs of manner (slowly) or adjectives (slow)?",
            "A/an, the, no article: The use of articles in English",
            "Conjunctions: And, but, or, so, because",
            "Basic word order in English",
            "The difference between 'this' and 'it'"
        ],
        "A2": [
            "Asking questions in English: Question forms",
            "Subject questions, questions with preposition",
            "Present simple vs present continuous",
            "Past simple: Form and use",
            "Past continuous and past simple",
            "Expressing purpose with 'to' and 'for'",
            "However, although, because, so, and time connectors",
            "'Will' vs 'be going to': Future forms",
            "Present continuous for future arrangements",
            "Defining relative clauses: Who, which, that, where",
            "Present perfect: Form and use",
            "Present perfect or past simple?",
            "Something, anything, nothing, etc.",
            "Comparative and superlative adjectives and adverbs",
            "Too, too much, too many, enough",
            "Much, many, little, few, some, any: Quantifiers",
            "Most, most of, the most",
            "Infinitives and gerunds: Verb patterns",
            "Have to, don't have to, must, mustn't",
            "Should, shouldn't",
            "First conditional and future time clauses",
            "Subject and object pronouns, possessive pronouns and adjectives",
            "Second conditional",
            "Present and past simple passive: 'be' + past participle",
            "Used to, didn't use to: Past habits and states",
            "Might, might not: Possibility",
            "Prepositions of movement: Along, across, over, etc.",
            "So, neither: So am I, neither do I, etc.",
            "Past perfect",
            "Reported speech / Indirect speech",
            "Verbs with two objects",
            "Do vs Make: What's the difference?",
            "Stative vs dynamic verbs (or non-action vs action verbs)",
            "Phrasal verbs: Transitive / intransitive, separable / inseparable",
            "No longer, any longer, anymore",
            "On time vs In time, At the end vs In the end",
            "May and might: What's the difference?"
        ],
        "B1": [
            "Present simple or present continuous",
            "Future forms: Will, be going to, present continuous",
            "Past simple or present perfect?",
            "Present perfect simple and present perfect continuous",
            "During, for, while",
            "Comparative and superlative adjectives and adverbs",
            "Another, other, others, the other, the others",
            "Can, could, be able to: Ability and possibility",
            "Have to, must, should: Obligation, prohibition, necessity, advice",
            "Reflexive pronouns: Myself, yourself, etc.",
            "-Ed/-ing adjectives: Adjectives from verbs",
            "Past simple, past continuous, past perfect",
            "Usually, used to, be used to, get used to",
            "Passive verb forms",
            "Active and passive voice",
            "Modal verbs of deduction: Must, may, might, could, can't",
            "First conditional, future time clauses",
            "Second conditional: Unreal situations",
            "First and second conditionals",
            "Third conditional: Past unreal situations",
            "Indirect speech / Reported speech",
            "Gerund or infinitive: Do, to do, doing",
            "Much, many, a lot, little, few, some, any, no: Quantifiers",
            "All, both: Quantifiers",
            "Both, either, neither: Quantifiers",
            "Any, no, none: Quantifiers",
            "So, such, such a, so much, so many",
            "Defining and non-defining relative clauses",
            "Question tags: Aren't you? don't you?",
            "Clauses of contrast, purpose and reason",
            "Verb + preposition: Dependent prepositions",
            "Adjective + preposition: Dependent prepositions",
            "Had better... It's time...",
            "For, since, from: What's the difference?",
            "Compound adjectives with numbers: 'a two-day trip'",
            "B1 Phrasal verbs 1: Exercises and explanation",
            "Would rather & Would sooner"
        ],
        "B1+": [
            "Questions: Different types",
            "Indirect questions",
            "Auxiliary verbs: Different uses",
            "The ... the ... comparatives",
            "Present perfect simple or continuous",
            "Adjectives without noun",
            "Adjective order",
            "So, such (a), so much, so many",
            "Narrative tenses: All past tenses",
            "Position of adverbs and adverb phrases",
            "Future continuous and future perfect",
            "Zero and first conditional and future time clauses",
            "Second and third conditionals: Unreal conditionals",
            "Wishes and regrets: I wish/if only",
            "Participles as adjectives: -ed/-ing adjectives",
            "Used to, be used to, get used to",
            "Would and used to: Past habits and repeated actions",
            "Gerund or infinitive: Verb patterns",
            "Past modal verbs of deduction",
            "Likely, unlikely, bound, definitely, probably: Probability",
            "Would rather, would prefer: Expressing preference",
            "Verbs of the senses: look, sound, feel, etc.",
            "The passive voice: All tenses",
            "The passive with reporting verbs: It is said that ...",
            "Have something done",
            "Reporting verbs: Admit doing, refuse to do, etc.",
            "Clauses of contrast and purpose",
            "Whatever, whenever, wherever, whoever, however",
            "Quantifiers: All, most, both, either, neither, any, no, none",
            "Already, still, yet: What's the difference?",
            "Needn't, don't need to, didn't need to, needn't have",
            "Pretty, rather, quite, fairly: Adverbs of degree",
            "When I do vs When I have done: Future time clauses",
            "Double negatives in English"
        ],
        "B2": [
            "Have: Auxiliary or main verb",
            "Clauses of contrast, purpose, reason and result",
            "Generic or common-gender pronouns",
            "Reflexive and reciprocal pronouns",
            "'There' and 'it': Preparatory subjects",
            "Narrative tenses, used to, would",
            "Get: Different meanings",
            "Discourse markers: Linking words",
            "Speculation and deduction: Modal verbs and expressions",
            "Inversion with negative adverbials: Adding emphasis",
            "Distancing: Expressions and passive of reporting verbs",
            "Wish, rather, if only, it's time: Unreal uses of past tenses",
            "Verb + object + infinitive/gerund: Verb patterns",
            "Unless, even if, provided, as long as, etc.: Other expressions in conditionals",
            "All conditionals: Mixed conditionals, alternatives to 'if', inversion",
            "Mixed conditionals: If I were you, I wouldn't have done it",
            "Modal verbs: Permission, obligation, prohibition, necessity",
            "Verbs of the senses",
            "Gerunds and infinitives: Complex forms",
            "Future forms: Expressing future time",
            "Other ways to express future: Be about to, be due to, etc.",
            "Future in the past",
            "Ellipsis and substitution: Omitting or replacing words",
            "Compound nouns and possessive forms",
            "Cleft sentences: Adding emphasis",
            "Relative clauses: Defining and non-defining",
            "Participle clauses",
            "Passive verbs with two objects",
            "Possessive ’s with time expressions: Two hours’ walk",
            "Compound adjectives in English",
            "Comparative structures: Modifying comparatives",
            "Reduced infinitives: Omitting the infinitive phrase after 'to'"
        ],
        "C1": [
            "Advanced present simple and present continuous",
            "Advanced past simple, past continuous & past perfect",
            "Advanced modal verbs: will, would and should",
            "Advanced modal verbs: can / be able to, may / might",
            "The subjunctive in English: Present and past",
            "The perfect tenses: Forms and uses"
        ]
    },
    de: {
        "A1": [
            "Präsens (Regelmäßige, unregelmäßige & trennbare Verben)",
            "Modalverben (können, müssen, wollen, dürfen)",
            "Nominativ und Akkusativ",
            "Possessivartikel",
            "Negation (nicht / kein)",
            "Fragesätze (W-Fragen & Ja/Nein-Fragen)",
            "Präpositionen mit Akkusativ (für, ohne, gegen)"
        ],
        "A2": [
            "Perfekt (mit haben & sein)",
            "Präteritum (nur sein, haben & Modalverben)",
            "Dativ & Präpositionen mit Dativ (aus, bei, mit, nach...)",
            "Wechselpräpositionen (Ort: Wo? vs. Wohin?)",
            "Nebensätze (weil, dass, wenn)",
            "Komparativ und Superlativ",
            "Reflexive Verben"
        ],
        "B1": [
            "Präteritum (alle Verben)",
            "Passiv Präsens & Präteritum",
            "Relativsätze",
            "Konjunktiv II (Wünsche, Ratschläge, Höflichkeit)",
            "Infinitiv mit zu & um...zu",
            "Genitiv",
            "N-Deklination",
            "Konjunktionen (obwohl, trotzdem, deshalb)"
        ],
        "B2": [
            "Passiv (alle Zeiten & mit Modalverben)",
            "Konjunktiv II der Vergangenheit (Irreale Bedingungen)",
            "Zweiteilige Konnektoren (entweder...oder, weder...noch)",
            "Verben, Adjektive & Nomen mit festen Präpositionen",
            "Partizipialattribute (Partizip I & II als Adjektiv)",
            "Plusquamperfekt",
            "Relativsätze (mit Präpositionen & 'was/wo')"
        ],
        "C1": [
            "Konjunktiv I (Indirekte Rede)",
            "Passiversatzformen (sich lassen, -bar, -fähig, sein zu)",
            "Nominalstil vs. Verbalstil",
            "Funktionsverbgefüge (z.B. eine Entscheidung treffen)",
            "Subjektive Bedeutung der Modalverben (Er soll krank sein)",
            "Erweiterte Partizipialattribute"
        ]
    }
};

const grammarExplanations = {
    en: {
        "Present simple forms of 'to be': am/is/are": "<b>Глагол <span style='color: #38bdf8;'>to be</span> (am / is / are)</b><br>Используется для описания состояния, возраста, профессий, национальности и местоположения, когда в предложении нет другого смыслового действия.<br>• <i>Формы:</i> <span style='color: #38bdf8;'>I am</span>, <span style='color: #38bdf8;'>He/She/It is</span>, <span style='color: #38bdf8;'>We/You/They are</span>.<br><b>Пример:</b> I <span style='color: #38bdf8;'>am</span> a student. They <span style='color: #38bdf8;'>are</span> at home."
    },
    de: {
        "Präsens (Regelmäßige, unregelmäßige & trennbare Verben)": "<b>Präsens (Настоящее время).</b> Обычные глаголы меняют окончания (-e, -st, -t, -en). Приставки у разделяемых глаголов уходят в конец.<br><b>Пример:</b> Ich <u>mache</u> die Tür <u>auf</u>."
    }
};

let grammarState = {
    rule: "",
    phrase: "",
    targetWord: "",
    helpClicks: 0
};

let currentGrammarLevel = null;

function showGrammarMenu(selectedLevel = null) {
    window.currentAppMode = 'grammar_menu';
    setAppHeader('Тренировка Правил', true);

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const oldTabsContainer = document.getElementById('grammar-tabs-container');
    const savedScrollLeft = oldTabsContainer ? oldTabsContainer.scrollLeft : 0;

    const chatContainer = document.getElementById('chat-messages');
    const lang = window.userProfile?.language || 'en';
    const rulesList = grammarRulesDict[lang] || grammarRulesDict['en'];
    const levels = Object.keys(rulesList);

    const rawUserLevel = window.userProfile?.difficulty || window.userProfile?.level || window.userProfile?.grammar_level;
    const matchedLevel = rawUserLevel
        ? levels.find(l => l.toLowerCase() === rawUserLevel.toLowerCase())
        : null;

    if (selectedLevel) {
        currentGrammarLevel = selectedLevel;
    } else {
        currentGrammarLevel = matchedLevel || levels[0];
    }

    if (!rulesList[currentGrammarLevel]) {
        currentGrammarLevel = levels[0];
    }

    let html = `
    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: -12px; width: 100%; box-sizing: border-box;">
        <div id="grammar-tabs-container" style="display: flex; gap: 6px; overflow-x: auto; padding: 0 0 4px 0; width: 100%; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
    `;

    levels.forEach(level => {
        const isActive = level === currentGrammarLevel;
        const activeStyle = isActive
            ? 'background: rgba(52, 199, 89, 0.3); border-color: rgba(52, 199, 89, 0.7); color: #34c759; box-shadow: 0 2px 8px rgba(52,199,89,0.2);'
            : 'background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.8);';

        html += `
            <button onclick="showGrammarMenu('${level}')" style="padding: 6px 14px; border-radius: 10px; border: 1px solid; ${activeStyle} font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s;">
                ${level}
            </button>
        `;
    });

    html += `</div>`;

    const rules = rulesList[currentGrammarLevel] || [];

    html += `<div style="display: flex; flex-direction: column; width: 100%; padding-top: 5px;">`;

    rules.forEach((rule, index) => {
        const safeRuleAttr = rule.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const chevronIcon = typeof APP_ICONS !== 'undefined' && APP_ICONS.chevronDown ? APP_ICONS.chevronDown : '▼';

        html += `
            <div class="dict-word-card" onclick="explainRule('${safeRuleAttr}')">
                <span style="color: #f8fafc; font-size: 14px; font-weight: 500; text-align: left; padding-right: 10px; line-height: 1.3;">${rule}</span>
                <span style="color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: rgba(255,255,255,0.05); border-radius: 6px; flex-shrink: 0;">
                    ${chevronIcon}
                </span>
            </div>
        `;
    });

    html += `</div></div>`;
    chatContainer.innerHTML = html;

    const newTabsContainer = document.getElementById('grammar-tabs-container');
    if (newTabsContainer) {
        newTabsContainer.scrollLeft = savedScrollLeft;
    }
}

// 🎯 УНИВЕРСАЛЬНАЯ ПРЕМИУМ-КАРТОЧКА
function showGrammarCard(htmlContent, buttonsHtml = '', isSpacious = false) {
    if (window.isRateLimitError(htmlContent)) return window.showLimitCard();
    const chatContainer = document.getElementById('chat-messages');

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px; margin-bottom: auto;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; position: relative; box-sizing: border-box; width: 100%; text-align: center;">
                <div style="width: 100%;">
                    ${htmlContent}
                </div>
                ${buttonsHtml ? `<div style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">${buttonsHtml}</div>` : ''}
            </div>
        </div>`;
}

function startGrammarTraining(rule) {
    window.currentAppMode = 'grammar_training';
    grammarState.rule = rule;
    grammarState.helpClicks = 0;

    const lang = window.userProfile?.language || 'en';
    const rulesList = grammarRulesDict[lang];
    let detectedLevel = "";

    for (const [level, rules] of Object.entries(rulesList)) {
        if (rules.includes(rule)) {
            detectedLevel = level;
            break;
        }
    }

    const difficultyForApi = detectedLevel ? detectedLevel.replace("+", "").split(" ")[0] : "A1";
    const safeRule = rule.replace(/'/g, "\\'");

    setAppHeader('Тренировка грамматики', true);

    document.getElementById('input-container').style.display = 'flex';
    document.getElementById('text-input-row').style.display = 'flex';
    document.getElementById('user-input').value = '';
    document.getElementById('user-input').placeholder = "Напиши перевод...";

    showGrammarCard(`
        <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
        <div style="font-size: 15px; color: var(--hint-color);">ИИ составляет предложение по правилу <br><b>${rule}</b>...</div>
    `);
    window.showAiLoader("ИИ составляет задание...");

    apiFetch(`/grammar/new-lego?chat_id=${user.id}&rule=${encodeURIComponent(rule)}&pattern_tag=default_mix&difficulty=${encodeURIComponent(difficultyForApi)}&only_my_vocab=false`)
        .then(data => {
            if (window.currentAppMode !== 'grammar_training') return;

            if (data.success) {
                grammarState.phrase = data.phrase;
                grammarState.targetWord = data.target_word || "базовое слово";

                let warningHtml = '';
                if (data.warning) {
                    warningHtml = `
                        <div style="background: rgba(255, 159, 10, 0.12); border: 1px solid rgba(255, 159, 10, 0.3); padding: 10px 14px; border-radius: 12px; text-align: left; margin-bottom: 14px; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 13px; color: #ff9f0a; line-height: 1.4;">${data.warning}</div>
                        </div>`;
                }

                let buttons = `
                    <button onclick="showGrammarHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1;">Подсказка</button>
                    <button onclick="startGrammarTraining('${safeRule}')" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Поменять</button>
                `;

                if (typeof renderTaskCard === 'function') {
                    renderTaskCard(data.phrase, grammarState.targetWord, grammarState.rule, data.xray, buttons, warningHtml);
                }
                document.getElementById('user-input').focus();
            } else {
                const errorText = (data.error || "").toLowerCase();
                if (errorText.includes('лимит') || errorText.includes('токен') || errorText.includes('429') || errorText.includes('quota')) {
                    if (typeof window.showLimitCard === 'function') return window.showLimitCard();
                }
                showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка генерации: ${data.error}</div>`);
            }
        }).catch(err => {
            showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка связи с сервером.</div>`);
        })
        .finally(() => {
            window.hideAiLoader();
        });
}

// 🎯 ОБРАБОТКА ВВОДА ПОЛЬЗОВАТЕЛЯ И КАРТОЧКА ОШИБКИ
function handleGrammarInput(text) {
    showGrammarCard(`
        <div style="font-size: 32px; margin-bottom: 10px;">🤖</div>
        <div style="font-size: 15px; color: var(--hint-color);">ИИ проверяет грамматику...</div>
    `);
    document.getElementById('text-input-row').style.display = 'none';

    apiFetch('/grammar/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            original_phrase: grammarState.phrase,
            answer: text,
            rule: grammarState.rule,
            target_word: grammarState.targetWord
        })
    }).then(data => {
        if (window.currentAppMode !== 'grammar_training') return;

        if (data.success) {
            const safeRule = grammarState.rule.replace(/'/g, "\\'");
            let btnNext = `<button onclick="startGrammarTraining('${safeRule}')" onmousedown="event.preventDefault()" class="btn-glass btn-glass-${data.is_correct ? 'green' : 'secondary'}" style="width: 100%; height: 46px;">🔄 Следующая фраза</button>`;

            let middleContent = '';

            if (data.is_correct) {
                middleContent = `
                    <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">✅ Отлично:</div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(52, 199, 89, 0.3); text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 15px; color: var(--text-color); font-weight: 500; word-wrap: break-word;">${text}</div>
                        <div style="font-size: 13px; color: var(--hint-color); margin-top: 8px; line-height: 1.4;">${data.feedback}</div>
                    </div>
                `;
            } else {
                // Экранируем переменные для вызова чата, чтобы кавычки в словах не сломали скрипт
                const safePhraseAttr = grammarState.phrase.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safeAnswerAttr = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                // Достаем эталонный ответ (ИИ может вернуть разные ключи)
                const correctVariant = data.correct_phrase || data.correct_answer || data.correct_variant;

                middleContent = `
                    <div style="font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">❌ Твой ответ:</div>
                    <div style="background: rgba(255, 59, 48, 0.1); padding: 12px 16px; border-radius: 10px; border-left: 4px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                        <div style="font-size: 15px; color: var(--text-color);">${text}</div>
                    </div>
                    
                    ${correctVariant ? `
                    <div style="font-size: 11px; color: #34c759; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">✅ Как нужно было сказать:</div>
                    <div style="background: rgba(52, 199, 89, 0.1); padding: 12px 16px; border-radius: 10px; border-left: 4px solid #34c759; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; color: var(--text-color); line-height: 1.4; word-wrap: break-word;">${correctVariant}</div>
                    </div>` : ''}

                    <div style="font-size: 11px; color: var(--hint-color); font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">Разбор ошибки:</div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 10px; border-left: 4px solid #ff3b30; text-align: left; width: 100%; box-sizing: border-box; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>

                    <!-- 🔥 ПОЛЕ ЧАТА С МЕНТОРОМ -->
                    <div style="width: 100%; margin-bottom: 5px; position: relative;">
                        <input type="text" id="inline-error-chat-input" onkeypress="if(event.key==='Enter') triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" placeholder="Спросить ИИ об ошибке..." style="width: 100%; height: 46px; padding: 0 45px 0 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        <button onclick="triggerInlineErrorChat('${safePhraseAttr}', '${safeAnswerAttr}')" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; background: var(--button-color); border: none; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                `;
            }

            showGrammarCard(`
                <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">Задание:</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 15px; word-wrap: break-word; text-align: left;">${grammarState.phrase}</div>
                
                ${middleContent}
            `, btnNext, true);
        } else {
            showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка проверки: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    });
}

function showGrammarHelp() {
    grammarState.helpClicks++;
    let step = grammarState.helpClicks;

    if (step > 1) {
        document.getElementById('text-input-row').style.display = 'none';
    }
    window.showAiLoader("ИИ думает...");

    apiFetch('/grammar/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            original_phrase: grammarState.phrase,
            step: step,
            rule: grammarState.rule,
            target_word: grammarState.targetWord
        })
    }).then(data => {
        if (window.currentAppMode !== 'grammar_training') return;

        if (data.success) {
            const safeRule = grammarState.rule.replace(/'/g, "\\'");
            if (step === 1) {
                let buttons = `
                    <button onclick="showGrammarHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft" style="flex: 1; background: rgba(255, 59, 48, 0.1); border-color: rgba(255, 59, 48, 0.3); color: #ff3b30;">Сдаюсь</button>
                    <button onclick="startGrammarTraining('${safeRule}')" onmousedown="event.preventDefault()" class="btn-glass-secondary" style="flex: 1;">Поменять</button>
                `;
                showGrammarCard(`
                    <div style="font-size: 22px; font-weight: 900; color: var(--text-color); margin-bottom: 14px; word-wrap: break-word;">${grammarState.phrase}</div>
                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); padding: 12px; border-radius: 10px; text-align: left; margin-bottom: 5px; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: bold; color: #ff9f0a; margin-bottom: 4px;">💡 Подсказка:</div>
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `, buttons);
                document.getElementById('text-input-row').style.display = 'flex';
            } else {
                let btnNext = `<button onclick="startGrammarTraining('${safeRule}')" onmousedown="event.preventDefault()" class="btn-glass btn-glass-green" style="width: 100%; height: 46px;">🔄 Следующая фраза</button>`;
                showGrammarCard(`
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; text-align: left;">Исходная фраза:</div>
                    <div style="font-size: 21px; font-weight: bold; color: var(--text-color); margin-bottom: 12px; word-wrap: break-word; text-align: left;">${grammarState.phrase}</div>
                    
                    <div style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 12px; border-radius: 10px; text-align: left; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: bold; color: #34c759; margin-bottom: 4px;">📖 Правильный ответ:</div>
                        <div style="font-size: 13px; color: var(--text-color); line-height: 1.4;">${data.feedback}</div>
                    </div>
                `, btnNext);
            }
        } else {
            showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">❌</div><div>Ошибка: ${data.error}</div>`);
            document.getElementById('text-input-row').style.display = 'flex';
        }
    }).catch(err => {
        showGrammarCard(`<div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><div>Ошибка сети.</div>`);
        document.getElementById('text-input-row').style.display = 'flex';
    }).finally(() => {
        window.hideAiLoader();
    });
}

function explainRule(ruleName) {
    const modal = document.getElementById('rule-explanation-modal');
    const windowEl = document.getElementById('rule-modal-window');
    const content = document.getElementById('rule-modal-content');
    const title = document.getElementById('rule-modal-title');
    const trainBtn = document.getElementById('rule-modal-train-btn');
    const iconSpan = document.getElementById('rule-train-icon');

    const keepFocus = function(event) {
        if (event.target === modal) event.preventDefault();
    };
    modal.onmousedown = keepFocus;
    modal.ontouchstart = keepFocus;

    if (iconSpan && typeof APP_ICONS !== 'undefined' && APP_ICONS.intensity) {
        iconSpan.innerHTML = APP_ICONS.intensity;
    }

    if (trainBtn) {
        if (window.currentAppMode === 'grammar_training') {
            trainBtn.style.display = 'none';
        } else {
            trainBtn.style.display = 'flex';
        }
    }

    const lang = window.userProfile?.language || 'en';
    let explanationText = "Краткое объяснение для этого правила пока не добавлено.";
    if (typeof grammarExplanations !== 'undefined' && grammarExplanations[lang] && grammarExplanations[lang][ruleName]) {
        explanationText = grammarExplanations[lang][ruleName];
    }

    title.innerText = ruleName;
    content.innerHTML = explanationText;

    if (trainBtn) {
        trainBtn.onclick = () => {
            closeRuleExplanation();
            setTimeout(() => {
                if (typeof startGrammarTraining === 'function') startGrammarTraining(ruleName);
            }, 300);
        };
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        windowEl.style.transform = 'translateY(0)';
    }, 10);
}

function closeRuleExplanation() {
    const modal = document.getElementById('rule-explanation-modal');
    const windowEl = document.getElementById('rule-modal-window');

    modal.style.opacity = '0';
    if (windowEl) windowEl.style.transform = 'translateY(100%)';

    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}