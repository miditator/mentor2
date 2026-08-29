# ==========================================
# ФАЙЛ: api/content_engine.py
# ==========================================
import json
import random
import re
from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "semantic_dictionary.db"

AI_RULE_INSTRUCTIONS_EN = {
    # ====================================
    # УРОВЕНЬ A1
    # ====================================
    "Present simple forms of 'to be': am/is/are": "Используй глагол 'to be' (am/is/are) как ОСНОВНОЙ смысловой глагол для описания состояния, возраста, профессии или местоположения. Строго запрещено использовать времена группы Continuous.",
    "This, that, these, those": "Используй указательное местоимение для указания на предметы. Если передан маркер (this/that/these/those), строго согласуй с ним число существительного.",
    "Possessive adjectives and subject pronouns (I/my, you/your, etc.)": "Построй предложение, сфокусированное на принадлежности или субъекте. Обязательно используй переданный маркер-местоимение.",
    "A/an, plurals: Singular and plural forms": "Сделай акцент на правильном использовании неопределенного артикля для единственного числа ИЛИ формы множественного числа.",
    "Adjectives": "Используй качественные прилагательные для описания существительного. Ставь прилагательное перед существительным или после глагола to be.",
    "Present simple: I do, I don't, Do I?": "Построй базовое утверждение, отрицание или вопрос в Present Simple, используя обычные смысловые глаголы (не to be).",
    "Questions: Word order and question words": "Построй специальный вопрос (Wh-question). Строго соблюдай порядок: Вопросительное слово + вспомогательный глагол + подлежащее + основной глагол.",
    "Adverbs of frequency with present simple": "Построй предложение в Present Simple, добавив наречие частотности. Наречие должно стоять СТРОГО перед основным глаголом или после глагола to be.",
    "Object pronouns vs subject pronouns: Me or I, she or her?": "Используй объектное местоимение (me, him, her, us, them) в роли дополнения (после глагола или предлога).",
    "Whose, possessive 's: Whose is this? It's Mike's": "Вырази принадлежность предмета конкретному лицу с помощью притяжательного падежа ('s) или вопросительного слова 'whose'.",
    "At, in, on: Prepositions of time": "Используй переданный маркер (at/in/on) СТРОГО как предлог ВРЕМЕНИ (часы, дни недели, месяцы, годы). Не используй его как предлог места.",
    "At, in, on: Prepositions of place": "Используй переданный маркер (at/in/on) СТРОГО как предлог МЕСТА (в здании, на поверхности, у точки). Не используй его как предлог времени.",
    "Can, can't: Ability, possibility, permission": "Вырази физическую способность, умение или разрешение что-то сделать с помощью модального глагола can/can't.",
    "Present continuous: I'm doing, I'm not doing, Are you doing?": "Опиши действие, происходящее прямо сейчас (в момент речи), строго используя время Present Continuous (am/is/are + V-ing).",
    "Present simple or present continuous?": "Если маркер указывает на рутину/регулярность — строй предложение в Present Simple. Если маркер указывает на момент речи — строго в Present Continuous.",
    "The imperative: Sit down! Don’t talk!": "Сформулируй прямой приказ, просьбу, совет или запрет, используя повелительное наклонение (начинай предложение сразу с глагола или с Don't).",
    "Was/were: Past simple of 'be'": "Опиши состояние, местоположение или качество в прошлом, используя глагол to be (was/were) как основной глагол.",
    "Past simple: Regular/irregular verbs": "Опиши разовое, завершенное действие в прошлом, используя время Past Simple.",
    "Past simple: Negatives and questions": "Сформулируй отрицание или вопрос в Past Simple, обязательно используя вспомогательный глагол did/didn't.",
    "Verbs + to + infinitive and verbs + -ing": "Построй предложение с двумя глаголами подряд. Если передан маркер, правильно присоедини к нему второй глагол (через 'to' или с окончанием '-ing').",
    "Would you like...? I'd like...": "Сформулируй вежливое предложение, приглашение или просьбу с помощью конструкции 'would like'.",
    "Have got": "Вырази обладание предметом, внешность или родственные связи с помощью конструкции 'have got' / 'has got'.",
    "A, some, any: Countable and uncountable nouns": "Продемонстрируй использование указателей количества. some — для утверждений, any — для вопросов/отрицаний.",
    "There is, there are / there was, there were": "Опиши наличие предметов в каком-то месте с помощью экзистенциальной конструкции (There is / There are).",
    "There or It": "Если предмет упоминается впервые или фиксируется его наличие — используй There. Если описывается погода, время или уже известный предмет — используй It.",
    "Next to, under, between, in front of, behind, over, etc.": "Опиши пространственное расположение объектов относительно друг друга с помощью предлогов места.",
    "Much, many, a lot of, a little, a few": "Используй переданный маркер количества строго в соответствии с правилами исчисляемости существительного, к которому он относится.",
    "Comparative adjectives: Older than, more important than, etc.": "Сравни два объекта между собой, используя сравнительную степень прилагательного (с суффиксом -er или словом more).",
    "Superlative adjectives: The oldest, the most important, etc.": "Выдели один объект как самый выдающийся в группе, используя превосходную степень прилагательного (the -est / the most).",
    "'Will' and 'shall': Future": "Вырази спонтанное решение, обещание или предсказание на будущее с помощью глаголов will / shall.",
    "Be going to: Plans and predictions": "Вырази заранее спланированное намерение или прогноз на основе очевидных фактов через конструкцию 'be going to'.",
    "Adverbs of manner (slowly) or adjectives (slow)?": "Если маркер — прилагательное, опиши им предмет. Если маркер — наречие образа действия (как?), опиши им глагол.",
    "A/an, the, no article: The use of articles in English": "Сделай акцент на выборе правильного артикля (определенного, неопределенного или нулевого).",
    "Conjunctions: And, but, or, so, because": "Соедини две части предложения логическим союзом. ВНИМАНИЕ: Если передан маркер 'so', используй его СТРОГО как союз 'поэтому/в итоге' (следствие), а не как усилитель 'очень'.",
    "Basic word order in English": "Построй предложение со строгим прямым порядком слов: Подлежащее + Сказуемое + Дополнение + Место + Время.",
    "The difference between 'this' and 'it'": "Продемонстрируй разницу: this используется для презентации или физического указания на объект, а it — для замены уже упомянутого.",

    # ====================================
    # УРОВЕНЬ A2
    # ====================================
    "Asking questions in English: Question forms": "Сформулируй общий или специальный вопрос, соблюдая строгую инверсию и правильное использование вспомогательных глаголов (do, be, have).",
    "Subject questions, questions with preposition": "Построй вопрос к подлежащему (без вспомогательного do/does, сохраняя прямой порядок) ИЛИ вопрос, в котором предлог стоит в самом конце (например, Who ... with?).",
    "Present simple vs present continuous": "Если маркер указывает на рутину/закон — строй в Present Simple. Если маркер указывает на момент сейчас/временную ситуацию — строго в Present Continuous.",
    "Past simple: Form and use": "Опиши факт или завершенное событие в прошлом, не связанное с настоящим моментом. Используй Past Simple.",
    "Past continuous and past simple": "Опиши ситуацию в прошлом: должно быть долгое фоновое действие (Past Continuous), на фоне которого происходит короткое завершенное событие (Past Simple).",
    "Expressing purpose with 'to' and 'for'": "Используй маркер СТРОГО для выражения ЦЕЛИ (ответ на вопрос 'Зачем? / Для чего?'). ВНИМАНИЕ: Если маркер 'for', после него должно идти существительное. Если 'to' — глагол.",
    "However, although, because, so, and time connectors": "Соедини два простых предложения в одно сложное, используя логический коннектор уступки, причины или следствия.",
    "'Will' vs 'be going to': Future forms": "Если маркер 'will' — опиши спонтанное решение или прогноз. Если 'going to' — опиши твердый план или предсказание на основе фактов.",
    "Present continuous for future arrangements": "Опиши 100% запланированную личную договоренность в будущем. Строго используй Present Continuous + маркер будущего времени.",
    "Defining relative clauses: Who, which, that, where": "Уточни существительное с помощью придаточного определительного (без запятых), используя правильное союзное слово.",
    "Present perfect: Form and use": "Опиши действие, которое завершилось или началось в прошлом, но его результат критически важен для настоящего момента (Present Perfect).",
    "Present perfect or past simple?": "Если маркер указывает на незавершенный период или жизненный опыт (already, yet) — используй Present Perfect. Если маркер закрытого прошлого (yesterday) — Past Simple.",
    "Something, anything, nothing, etc.": "Используй неопределенное местоимение (someone, anything, nowhere). Учти тип предложения: утверждение, отрицание или вопрос.",
    "Comparative and superlative adjectives and adverbs": "Сравни два объекта или выдели один из группы, применяя степени сравнения прилагательных или наречий.",
    "Too, too much, too many, enough": "Покажи избыточность (too / too much) или достаточность (enough) чего-либо. Соблюдай правила работы с исчисляемыми/неисчисляемыми существительными.",
    "Much, many, little, few, some, any: Quantifiers": "Задай правильное количество с помощью квантификатора. Соблюдай правила работы с исчисляемыми и неисчисляемыми существительными.",
    "Most, most of, the most": "Если маркер 'most' — говори о большинстве в целом. Если 'most of' — о большинстве из конкретной группы (с артиклем). Если 'the most' — используй превосходную степень.",
    "Infinitives and gerunds: Verb patterns": "Построй предложение с двумя глаголами. Глагол, идущий после основного, должен быть СТРОГО в форме герундия (-ing) или инфинитива (to).",
    "Have to, don't have to, must, mustn't": "Вырази строгий внутренний долг (must), вынужденную внешнюю необходимость (have to), отсутствие необходимости (don't have to) или строгий запрет (mustn't).",
    "Should, shouldn't": "Дай моральный совет, рекомендацию или укажи на правильный поступок с помощью should / shouldn't.",
    "First conditional and future time clauses": "Построй реальное условие для будущего (If + Present Simple, ... + Will + Verb).",
    "Subject and object pronouns, possessive pronouns and adjectives": "Замени существительные подходящими местоимениями. Обрати внимание на абсолютную форму (mine, yours), которая используется без существительного после.",
    "Second conditional": "Сформулируй воображаемую, нереальную ситуацию в настоящем (If + Past Simple, ... + would + Verb).",
    "Present and past simple passive: 'be' + past participle": "Построй предложение в пассивном залоге: фокус должен быть на объекте, над которым совершается регулярное (Present) или совершенное (Past) действие.",
    "Used to, didn't use to: Past habits and states": "Опиши привычку или регулярное состояние в прошлом, которое больше абсолютно не актуально в настоящем.",
    "Might, might not: Possibility": "Вырази предположение или вероятность события (~50% уверенности) в настоящем или будущем.",
    "Prepositions of movement: Along, across, over, etc.": "Опиши динамическое движение объекта в пространстве (куда? по какой траектории?), используя предлог направления.",
    "So, neither: So am I, neither do I, etc.": "Сформулируй краткое согласие с предыдущим утверждением (So do I) или отрицанием (Neither do I).",
    "Past perfect": "Опиши действие в прошлом, которое полностью завершилось ДО другого события в прошлом (Предпрошедшее время).",
    "Reported speech / Indirect speech": "Передай слова другого человека через косвенную речь. Обязательно выполни грамматический сдвиг времен (Shift back).",
    "Verbs with two objects": "Построй предложение с глаголом, у которого есть два дополнения (Например: дать кому-то что-то).",
    "Do vs Make: What's the difference?": "Если маркер связан с 'do' — опиши рутину, задание или абстрактное дело. Если с 'make' — процесс созидания, производства или результат.",
    "Stative vs dynamic verbs (or non-action vs action verbs)": "Используй переданный маркер (стативный глагол, выражающий чувство, состояние или владение) СТРОГО во времени группы Simple. Использование Continuous запрещено.",
    "Phrasal verbs: Transitive / intransitive, separable / inseparable": "Органично вплети фразовый глагол в предложение. Если он разделяемый и дополнение выражено местоимением, местоимение должно стоять между глаголом и предлогом.",
    "No longer, any longer, anymore": "Покажи, что действие или состояние, происходившее раньше, полностью прекратилось к моменту речи.",
    "On time vs In time, At the end vs In the end": "Используй маркер точно: on time (точно по расписанию), in time (успеть до дедлайна), at the end (в физическом конце чего-то), in the end (в итоге/в конце концов).",
    "May and might: What's the difference?": "Вырази вероятность события. Используй May для более высокой вероятности, а Might — для низкой (теоретической).",
# ====================================
    # УРОВЕНЬ B1
    # ====================================
    "Present simple or present continuous": "Разграничь рутину (Present Simple) и процесс в момент речи или временную ситуацию (Present Continuous). Строго ориентируйся на переданный маркер.",
    "Future forms: Will, be going to, present continuous": "Вырази будущее. Если маркер спонтанности или обещания — используй will. Если маркер плана — be going to. Если 100% договоренности — Present Continuous.",
    "Past simple or present perfect?": "Разграничь закрытое завершенное прошлое (Past Simple) и прошлый опыт, связанный с настоящим (Present Perfect). Ориентируйся СТРОГО на маркер времени.",
    "Present perfect simple and present perfect continuous": "Покажи связь прошлого с настоящим. Если важен факт или количество результатов — используй Present Perfect Simple. Если важна длительность процесса до текущего момента — Present Perfect Continuous.",
    "During, for, while": "Используй маркер для указания времени. 'During' требует после себя существительного. 'For' требует периода времени (как долго?). 'While' требует придаточного предложения (подлежащее + сказуемое).",
    "Comparative and superlative adjectives and adverbs": "Построй сравнение двух объектов или выдели один из группы, применяя степени сравнения прилагательных или наречий.",
    "Another, other, others, the other, the others": "Используй правильную форму местоимения (other/another/others) в зависимости от того, исчисляемое ли слово, единственное ли оно и определено ли оно.",
    "Can, could, be able to: Ability and possibility": "Вырази способность, умение или возможность в настоящем, прошлом или будущем.",
    "Have to, must, should: Obligation, prohibition, necessity, advice": "Вырази логическое долженствование, отсутствие необходимости, запрет или совет.",
    "Reflexive pronouns: Myself, yourself, etc.": "Используй возвратное местоимение (-self, -selves) для отражения действия на самого субъекта или для смыслового усиления ('сделал сам').",
    "-Ed/-ing adjectives: Adjectives from verbs": "Используй причастие-прилагательное. Если описываешь чувство/состояние субъекта -> используй -ed. Если описываешь причину (качество предмета) -> используй -ing.",
    "Past simple, past continuous, past perfect": "Построй сложный нарратив прошлого, смешивая фон (Continuous), само событие (Simple) или предпрошедшее время (Perfect).",
    "Usually, used to, be used to, get used to": "Разграничь: used to (прошлая неактуальная привычка), be used to (состояние адаптации), get used to (процесс привыкания), usually (рутина в настоящем).",
    "Passive verb forms": "Построй предложение в пассивном (страдательном) залоге в любом времени.",
    "Active and passive voice": "Построй предложение. Если передан маркер пассива (например, 'was written by') — делай акцент на объекте. Иначе — на субъекте.",
    "Modal verbs of deduction: Must, may, might, could, can't": "Сделай логический вывод, догадку или предположение (о настоящем или прошлом) с помощью модального глагола. Учти степень уверенности.",
    "First conditional, future time clauses": "Построй реальное условие для будущего (If / when / as soon as + Present Simple, ... + Will / Can + V).",
    "Second conditional: Unreal situations": "Построй нереальное гипотетическое условие в настоящем или будущем (If + Past Simple, ... would + V).",
    "First and second conditionals": "Сформулируй условие. Если маркер указывает на реальное будущее — строй First Conditional. Если на фантазию/гипотезу — Second Conditional.",
    "Third conditional: Past unreal situations": "Построй абсолютно нереальное условие в прошлом: сожаление или фантазию о том, что уже нельзя изменить (If + Past Perfect, ... would have + V3).",
    "Indirect speech / Reported speech": "Передай чужую речь в косвенном формате, обязательно соблюдая правило согласования времен (Sequence of Tenses — сдвиг времен в прошлое).",
    "Gerund or infinitive: Do, to do, doing": "Построй предложение со сложным глагольным управлением. Используй после основного глагола правильную форму: герундий (-ing) или инфинитив (to + V).",
    "Much, many, a lot, little, few, some, any, no: Quantifiers": "Задай правильное количество с помощью квантификатора. Соблюдай правила работы с исчисляемыми и неисчисляемыми существительными.",
    "All, both: Quantifiers": "Используй 'all' для описания всей группы (3+ объектов) или 'both' для описания ровно двух объектов.",
    "Both, either, neither: Quantifiers": "Вырази отношение к двум объектам: оба (both), любой из двух (either), ни один из двух (neither).",
    "Any, no, none: Quantifiers": "Вырази полное отсутствие чего-либо (no/none) или неограниченный выбор в утверждении (any = 'любой').",
    "So, such, such a, so much, so many": "Вырази сильное усиление качества или количества. 'So' ставится перед прилагательным/наречием, 'Such' — перед существительным.",
    "Defining and non-defining relative clauses": "Добавь к существительному придаточное определительное. Обязательно используй переданное союзное слово.",
    "Question tags: Aren't you? don't you?": "Построй предложение (утверждение или отрицание) и добавь к нему грамматически правильный разделительный вопрос (tag) в самом конце.",
    "Clauses of contrast, purpose and reason": "Построй сложноподчиненное предложение с придаточным уступки, цели или причины, используя переданный союз.",
    "Verb + preposition: Dependent prepositions": "Используй переданный глагол со строго закрепленным за ним (зависимым) предлогом.",
    "Adjective + preposition: Dependent prepositions": "Используй переданное прилагательное со строго закрепленным за ним предлогом.",
    "Had better... It's time...": "Вырази сильный совет с оттенком угрозы (had better + bare infinitive) или укажи, что действие уже пора было совершить (it's time + Past Simple).",
    "For, since, from: What's the difference?": "Используй маркер начала периода (since / from) или маркер общей длительности (for) в правильном грамматическом времени.",
    "Compound adjectives with numbers: 'a two-day trip'": "Используй составное прилагательное с числительным (строго через дефис, без окончания множественного числа -s).",
    "B1 Phrasal verbs 1: Exercises and explanation": "Органично вплети переданный фразовый глагол в живой разговорный контекст.",
    "Would rather & Would sooner": "Вырази предпочтение. Если субъект один: would rather + infinitive. Если кто-то хочет, чтобы действие сделал другой: would rather + Past Simple.",

    # ====================================
    # УРОВЕНЬ B1+
    # ====================================
    "Questions: Different types": "Построй вопрос специфического типа (вопрос к подлежащему, вопрос с хвостиком или отрицательный вопрос) на основе переданного маркера.",
    "Indirect questions": "Построй косвенный (очень вежливый) вопрос. ВНИМАНИЕ: в придаточной части вопроса должен быть СТРОГО прямой порядок слов (без вспомогательных do/does/did).",
    "Auxiliary verbs: Different uses": "Используй вспомогательный глагол для усиления (эмфазы) значения, либо для краткого согласия (So do I / Neither do I).",
    "The ... the ... comparatives": "Построй предложение с двойным сравнительным оборотом (конструкция 'Чем ..., тем ...').",
    "Present perfect simple or continuous": "Построй продвинутое предложение, сделав правильный выбор между акцентом на результат (Perfect Simple) и акцентом на длительность процесса (Perfect Continuous).",
    "Adjectives without noun": "Используй прилагательное с определенным артиклем 'the' для обозначения целой социальной группы (например, the rich). Глагол после него должен быть во множественном числе.",
    "Adjective order": "Опиши существительное, используя цепочку из 2-3 прилагательных, строго соблюдая их естественный порядок (Мнение -> Размер -> Возраст -> Цвет -> Происхождение -> Материал).",
    "Narrative tenses: All past tenses": "Построй богатый литературный или жизненный рассказ в прошедшем времени, смешивая Past Simple, Continuous и Perfect.",
    "Position of adverbs and adverb phrases": "Построй предложение, обратив особое внимание на правильную позицию наречия (например: до основного глагола, но после to be; или в начале/конце фразы).",
    "Future continuous and future perfect": "Опиши процесс, который будет находиться в развитии в будущем (Continuous), или действие, которое завершится строго к указанному моменту (Perfect).",
    "Zero and first conditional and future time clauses": "Построй условие 0 типа (законы природы), 1 типа (реальное будущее) или используй придаточное времени (when/as soon as + Present Simple).",
    "Second and third conditionals: Unreal conditionals": "Построй нереальное гипотетическое условие (о настоящем/будущем через Second Conditional, о прошлом через Third Conditional).",
    "Wishes and regrets: I wish/if only": "Вырази глубокое желание или сожаление (I wish / if only). О настоящем — через Past Simple, о прошлом — через Past Perfect.",
    "Participles as adjectives: -ed/-ing adjectives": "Используй причастие-прилагательное (-ed для описания чувства, -ing для описания источника чувства).",
    "Used to, be used to, get used to": "Используй правильную конструкцию для описания прошлой привычки, состояния привыкания или процесса адаптации.",
    "Would and used to: Past habits and repeated actions": "Опиши регулярные привычки в прошлом. Учти: 'would' можно использовать только с глаголами действия (dynamic verbs), а не состояния.",
    "Gerund or infinitive: Verb patterns": "Построй предложение, учитывая, что некоторые глаголы (remember, stop, try, forget) кардинально меняют смысл в зависимости от идущего за ними герундия (-ing) или инфинитива (to + V).",
    "Past modal verbs of deduction": "Вырази дедукцию, логический вывод или догадку о ПРОШЛОМ завершенном событии (modal + have + V3).",
    "Likely, unlikely, bound, definitely, probably: Probability": "Оцени шансы или вероятность будущего события с помощью переданного наречия или конструкции (is likely to / bound to).",
    "Would rather, would prefer: Expressing preference": "Вырази предпочтение. Обрати внимание на синтаксис: would rather + bare infinitive, would prefer + to infinitive.",
    "Verbs of the senses: look, sound, feel, etc.": "Используй глаголы восприятия с прилагательными или союзами like / as if для выражения впечатления от объекта.",
    "The passive voice: All tenses": "Построй пассивное предложение в продвинутом времени (например, в Continuous Passive или Perfect Passive).",
    "The passive with reporting verbs: It is said that ...": "Используй пассивную конструкцию с глаголом сообщения для обезличивания информации (It is said that... / He is believed to...).",
    "Have something done": "Используй каузативную форму (have/get + объект + V3), чтобы показать, что услуга была выполнена для заказчика кем-то другим.",
    "Reporting verbs: Admit doing, refuse to do, etc.": "Передай чужую речь, используя продвинутые глаголы (admit, refuse, promise, suggest) и правильный паттерн после них (герундий или инфинитив).",
    "Clauses of contrast and purpose": "Построй сложное предложение с придаточным уступки или цели. Соблюдай синтаксис: после despite/in spite of идет существительное или герундий, после although — полноценное предложение.",
    "Whatever, whenever, wherever, whoever, however": "Используй слова с суффиксом -ever для выражения отсутствия ограничений ('что бы ни', 'где бы ни', 'как бы ни').",
    "Quantifiers: All, most, both, either, neither, any, no, none": "Используй продвинутый квантификатор, сделав акцент на конструкции с предлогом of (all of them, none of us).",
    "Already, still, yet: What's the difference?": "Используй переданное наречие времени в правильном времени (обычно Perfect или Continuous) с соблюдением его позиции в предложении.",
    "Needn't, don't need to, didn't need to, needn't have": "Вырази отсутствие необходимости. ВНИМАНИЕ на разницу: didn't need to (было не нужно, и мы не сделали) vs needn't have done (было не нужно, но мы зачем-то сделали).",
    "Pretty, rather, quite, fairly: Adverbs of degree": "Используй переданное наречие степени для ослабления или усиления идущего за ним прилагательного.",
    "When I do vs When I have done: Future time clauses": "Построй придаточное времени будущего. Используй Present Perfect вместо Present Simple, чтобы подчеркнуть, что одно действие должно строго завершиться до начала второго.",
    "Double negatives in English": "Построй отрицательное предложение, используя слова с встроенным негативным значением (hardly, barely, scarcely). КАТЕГОРИЧЕСКИ запрещено добавлять частицу 'not'.",

    # ====================================
    # УРОВЕНЬ B2
    # ====================================
    "Have: Auxiliary or main verb": "Используй have либо как основной смысловой глагол, либо как вспомогательный (в составе Perfect или каузатива), строго согласно переданному маркеру.",
    "Clauses of contrast, purpose, reason and result": "Используй формальные и продвинутые союзы для логического академического связывания частей предложения.",
    "Generic or common-gender pronouns": "Опиши неконкретного человека (everyone, anybody) и сошлись на него далее с помощью гендерно-нейтрального местоимения they / their / them.",
    "Reflexive and reciprocal pronouns": "Четко разграничь возвратное действие на самого себя (themselves) и взаимное действие друг на друга (each other / one another).",
    "'There' and 'it': Preparatory subjects": "Используй формальное подлежащее There или It в устойчивой сложной синтаксической конструкции (например, It is no use doing, There is no point in).",
    "Narrative tenses, used to, would": "Сгенерируй сложный литературный или публицистический нарратив, описывающий цепочку прошлых событий.",
    "Get: Different meanings": "Используй глагол get в его неформальном или фразовом значении (стать, добраться, понять, уговорить), согласно маркеру.",
    "Discourse markers: Linking words": "Введи предложение или свяжи абзацы с помощью дискурсивного маркера (вводного слова) высокого уровня.",
    "Speculation and deduction: Modal verbs and expressions": "Сделай аналитический логический вывод или догадку с высокой долей уверенности о событиях настоящего или прошлого.",
    "Inversion with negative adverbials: Adding emphasis": "Сгенерируй эмфатическое предложение с инверсией! Поставь отрицательное наречие в начало, затем вспомогательный глагол, а затем подлежащее.",
    "Distancing: Expressions and passive of reporting verbs": "Используй академический язык: дистанцируйся от факта с помощью сложного пассива мнения (is alleged to be, appears to).",
    "Wish, rather, if only, it's time: Unreal uses of past tenses": "Сгенерируй предложение, где прошедшее время используется для выражения нереального настоящего, предпочтения (I'd rather you did) или упрека (It's high time).",
    "Verb + object + infinitive/gerund: Verb patterns": "Построй конструкцию 'Сложное дополнение' (Complex Object), заставив один объект совершить действие над другим.",
    "Unless, even if, provided, as long as, etc.: Other expressions in conditionals": "Сформулируй условное предложение, заменив классический союз 'if' на более продвинутую альтернативу.",
    "All conditionals: Mixed conditionals, alternatives to 'if', inversion": "Построй условное предложение высшего порядка: смешанное условие ИЛИ бессоюзное условие с инверсией (Had I known...).",
    "Mixed conditionals: If I were you, I wouldn't have done it": "Сформулируй смешанное условие (Mixed Conditional): покажи влияние нереального прошлого на нереальное настоящее, или наоборот.",
    "Modal verbs: Permission, obligation, prohibition, necessity": "Сгенерируй фразу, выражающую сложные социальные или юридические обязательства, разрешения или жесткие запреты.",
    "Verbs of the senses": "Используй глагол чувственного восприятия в продвинутом синтаксисе (с конструкцией as if / as though).",
    "Gerunds and infinitives: Complex forms": "Используй неличную форму глагола в перфектном или пассивном виде (например, having done, to be done, to have been doing).",
    "Future forms: Expressing future time": "Сгенерируй предложение, выражающее различные нюансы будущего времени (Future Continuous, Future Perfect).",
    "Other ways to express future: Be about to, be due to, etc.": "Вырази будущее через формальные или эмфатические конструкции (действие вот-вот произойдет или должно случиться по расписанию).",
    "Future in the past": "Опиши будущее с точки зрения прошлого, используя сдвиг времен (was going to, was about to, would).",
    "Ellipsis and substitution: Omitting or replacing words": "Сгенерируй диалог или сложное предложение, избегая тавтологии с помощью слов-заместителей (so, not) или эллипсиса (опущения глагола).",
    "Compound nouns and possessive forms": "Используй составное существительное или притяжательный падеж 's с неодушевленными понятиями времени, стоимости или расстояния.",
    "Cleft sentences: Adding emphasis": "Выдели смысловую часть предложения с помощью расщепленной структуры (Cleft sentence: It is ... that ... / What I really need is ...).",
    "Relative clauses: Defining and non-defining": "Построй сложное относительное придаточное с предлогом, стоящим ПЕРЕД союзным словом (например, in which, to whom).",
    "Participle clauses": "Замени целое придаточное предложение изящным причастным или деепричастным оборотом (-ing / -ed / having V3) для академичности.",
    "Passive verbs with two objects": "Построй пассивное предложение от глагола с двумя дополнениями, сделав подлежащим человека (косвенное дополнение).",
    "Compound adjectives in English": "Сгенерируй фразу с использованием сложного многокомпонентного прилагательного.",
    "Comparative structures: Modifying comparatives": "Усили или ослабь сравнительную степень с помощью продвинутых модификаторов (nowhere near as, considerably less).",
    "Reduced infinitives: Omitting the infinitive phrase after 'to'": "Сгенерируй фразу, где основной глагол после частицы 'to' опущен во избежание повторения (например: I'd love to, but...).",

    # ====================================
    # УРОВЕНЬ C1
    # ====================================
    "Advanced present simple and present continuous": "Используй настоящее время в продвинутом стиле: для выражения крайнего раздражения (Continuous + always/forever) или для официальных деклараций (Simple).",
    "Advanced past simple, past continuous & past perfect": "Построй сложный литературный нарратив, описывая сорванные планы прошлого (had hoped to) или резкую смену событий (hardly had ... when).",
    "Advanced modal verbs: will, would and should": "Используй модальные глаголы для выражения критики, раздражающих упрямых привычек субъекта или ретроспективного упрека.",
    "Advanced modal verbs: can / be able to, may / might": "Вырази ироничную критику (might have told me), сарказм или констатацию успешного преодоления трудной преграды (managed to).",
    "The subjunctive in English: Present and past": "СТРОГО: Используй сослагательное наклонение (Subjunctive mood). В настоящем времени применяй голый инфинитив (без 's' в 3 лице: demand that he resign). В прошлом — форму 'were' для всех лиц.",
    "The perfect tenses: Forms and uses": "Используй перфектные времена на максимальном уровне сложности: перфектный инфинитив, перфектный герундий или Future Perfect Continuous для смещения акцента на предшествование."
}

# 🔥 ГРАММАТИКА СТРОГО ПО УРОВНЯМ И ЯЗЫКАМ
GRAMMAR_RULES_BY_LEVEL = {
    "en": {
        "A1": [
            "Present simple forms of 'to be': am/is/are", "This, that, these, those",
            "Possessive adjectives and subject pronouns (I/my, you/your, etc.)", "A/an, plurals: Singular and plural forms",
            "Adjectives", "Present simple: I do, I don't, Do I?", "Questions: Word order and question words",
            "Adverbs of frequency with present simple", "Object pronouns vs subject pronouns: Me or I, she or her?",
            "Whose, possessive 's: Whose is this? It's Mike's", "At, in, on: Prepositions of time",
            "At, in, on: Prepositions of place", "Can, can't: Ability, possibility, permission",
            "Present continuous: I'm doing, I'm not doing, Are you doing?", "Present simple or present continuous?",
            "The imperative: Sit down! Don’t talk!", "Was/were: Past simple of 'be'",
            "Past simple: Regular/irregular verbs", "Past simple: Negatives and questions",
            "Verbs + to + infinitive and verbs + -ing", "Would you like...? I'd like...", "Have got",
            "A, some, any: Countable and uncountable nouns", "There is, there are / there was, there were",
            "There or It", "Next to, under, between, in front of, behind, over, etc.",
            "Much, many, a lot of, a little, a few", "Comparative adjectives: Older than, more important than, etc.",
            "Superlative adjectives: The oldest, the most important, etc.", "'Will' and 'shall': Future",
            "Be going to: Plans and predictions", "Adverbs of manner (slowly) or adjectives (slow)?",
            "A/an, the, no article: The use of articles in English", "Conjunctions: And, but, or, so, because",
            "Basic word order in English", "The difference between 'this' and 'it'"
        ],
        "A2": [
            "Asking questions in English: Question forms", "Subject questions, questions with preposition",
            "Present simple vs present continuous", "Past simple: Form and use", "Past continuous and past simple",
            "Expressing purpose with 'to' and 'for'", "However, although, because, so, and time connectors",
            "'Will' vs 'be going to': Future forms", "Present continuous for future arrangements",
            "Defining relative clauses: Who, which, that, where", "Present perfect: Form and use",
            "Present perfect or past simple?", "Something, anything, nothing, etc.",
            "Comparative and superlative adjectives and adverbs", "Too, too much, too many, enough",
            "Much, many, little, few, some, any: Quantifiers", "Most, most of, the most",
            "Infinitives and gerunds: Verb patterns", "Have to, don't have to, must, mustn't",
            "Should, shouldn't", "First conditional and future time clauses",
            "Subject and object pronouns, possessive pronouns and adjectives", "Second conditional",
            "Present and past simple passive: 'be' + past participle", "Used to, didn't use to: Past habits and states",
            "Might, might not: Possibility", "Prepositions of movement: Along, across, over, etc.",
            "So, neither: So am I, neither do I, etc.", "Past perfect", "Reported speech / Indirect speech",
            "Verbs with two objects", "Do vs Make: What's the difference?",
            "Stative vs dynamic verbs (or non-action vs action verbs)",
            "Phrasal verbs: Transitive / intransitive, separable / inseparable", "No longer, any longer, anymore",
            "On time vs In time, At the end vs In the end", "May and might: What's the difference?"
        ],
        "B1": [
            "Present simple or present continuous", "Future forms: Will, be going to, present continuous",
            "Past simple or present perfect?", "Present perfect simple and present perfect continuous",
            "During, for, while", "Comparative and superlative adjectives and adverbs",
            "Another, other, others, the other, the others", "Can, could, be able to: Ability and possibility",
            "Have to, must, should: Obligation, prohibition, necessity, advice", "Reflexive pronouns: Myself, yourself, etc.",
            "-Ed/-ing adjectives: Adjectives from verbs", "Past simple, past continuous, past perfect",
            "Usually, used to, be used to, get used to", "Passive verb forms", "Active and passive voice",
            "Modal verbs of deduction: Must, may, might, could, can't", "First conditional, future time clauses",
            "Second conditional: Unreal situations", "First and second conditionals",
            "Third conditional: Past unreal situations", "Indirect speech / Reported speech",
            "Gerund or infinitive: Do, to do, doing", "Much, many, a lot, little, few, some, any, no: Quantifiers",
            "All, both: Quantifiers", "Both, either, neither: Quantifiers", "Any, no, none: Quantifiers",
            "So, such, such a, so much, so many", "Defining and non-defining relative clauses",
            "Question tags: Aren't you? don't you?", "Clauses of contrast, purpose and reason",
            "Verb + preposition: Dependent prepositions", "Adjective + preposition: Dependent prepositions",
            "Had better... It's time...", "For, since, from: What's the difference?",
            "Compound adjectives with numbers: 'a two-day trip'", "B1 Phrasal verbs 1: Exercises and explanation",
            "Would rather & Would sooner"
        ],
        "B2": [
            "Have: Auxiliary or main verb", "Clauses of contrast, purpose, reason and result",
            "Generic or common-gender pronouns", "Reflexive and reciprocal pronouns",
            "'There' and 'it': Preparatory subjects", "Narrative tenses, used to, would",
            "Get: Different meanings", "Discourse markers: Linking words",
            "Speculation and deduction: Modal verbs and expressions", "Inversion with negative adverbials: Adding emphasis",
            "Distancing: Expressions and passive of reporting verbs", "Wish, rather, if only, it's time: Unreal uses of past tenses",
            "Verb + object + infinitive/gerund: Verb patterns", "Unless, even if, provided, as long as, etc.: Other expressions in conditionals",
            "All conditionals: Mixed conditionals, alternatives to 'if', inversion", "Mixed conditionals: If I were you, I wouldn't have done it",
            "Modal verbs: Permission, obligation, prohibition, necessity", "Verbs of the senses",
            "Gerunds and infinitives: Complex forms", "Future forms: Expressing future time",
            "Other ways to express future: Be about to, be due to, etc.", "Future in the past",
            "Ellipsis and substitution: Omitting or replacing words", "Compound nouns and possessive forms",
            "Cleft sentences: Adding emphasis", "Relative clauses: Defining and non-defining",
            "Participle clauses", "Passive verbs with two objects", "Possessive ’s with time expressions: Two hours’ walk",
            "Compound adjectives in English", "Comparative structures: Modifying comparatives",
            "Reduced infinitives: Omitting the infinitive phrase after 'to'"
        ],
        "C1": [
            "Advanced present simple and present continuous", "Advanced past simple, past continuous & past perfect",
            "Advanced modal verbs: will, would and should", "Advanced modal verbs: can / be able to, may / might",
            "The subjunctive in English: Present and past", "The perfect tenses: Forms and uses"
        ]
    },
    "de": {
        "A1": [
            "Präsens (Regelmäßige, unregelmäßige & trennbare Verben)", "Modalverben (können, müssen, wollen, dürfen)",
            "Nominativ und Akkusativ", "Possessivartikel", "Negation (nicht / kein)",
            "Fragesätze (W-Fragen & Ja/Nein-Fragen)", "Präpositionen mit Akkusativ (für, ohne, gegen)"
        ],
        "A2": [
            "Perfekt (mit haben & sein)", "Präteritum (nur sein, haben & Modalverben)",
            "Dativ & Präpositionen mit Dativ (aus, bei, mit, nach...)", "Wechselpräpositionen (Ort: Wo? vs. Wohin?)",
            "Nebensätze (weil, dass, wenn)", "Komparativ und Superlativ", "Reflexive Verben"
        ],
        "B1": [
            "Präteritum (alle Verben)", "Passiv Präsens & Präteritum", "Relativsätze",
            "Konjunktiv II (Wünsche, Ratschläge, Höflichkeit)", "Infinitiv mit zu & um...zu",
            "Genitiv", "N-Deklination", "Konjunktionen (obwohl, trotzdem, deshalb)"
        ],
        "B2": [
            "Passiv (alle Zeiten & mit Modalverben)", "Konjunktiv II der Vergangenheit (Irreale Bedingungen)",
            "Zweiteilige Konnektoren (entweder...oder, weder...noch)", "Verben, Adjektive & Nomen mit festen Präpositionen",
            "Partizipialattribute (Partizip I & II als Adjektiv)", "Plusquamperfekt",
            "Relativsätze (mit Präpositionen & 'was/wo')"
        ],
        "C1": [
            "Konjunktiv I (Indirekte Rede)", "Passiversatzformen (sich lassen, -bar, -fähig, sein zu)",
            "Nominalstil vs. Verbalstil", "Funktionsverbgefüge (z.B. eine Entscheidung treffen)",
            "Subjektive Bedeutung der Modalverben (Er soll krank sein)", "Erweiterte Partizipialattribute"
        ]
    }
}







def translate_concept_to_theme(concept_name: str) -> str:
    # Словарь соответствия концептов семантического графа живым темам
    mapping = {
        "PERSON": "Люди, общество и личные взаимоотношения",
        "OBJECT": "Предметы обихода и материальный мир",
        "LIVING_BEING": "Живая природа, животные и биология",
        "BODY": "Анатомия, здоровье и физическое состояние",
        "FOOD": "Еда, напитки, кулинария и рестораны",
        "SUBSTANCE": "Вещества, материалы и физические элементы",
        "RESOURCE": "Ресурсы, энергетика и окружающая среда",
        "MONEY": "Финансы, экономика, покупки и бизнес",
        "WORK": "Работа, профессия, офис и карьера",
        "EDUCATION": "Образование, наука, учеба и школа",
        "INFORMATION": "Информация, данные, СМИ и коммуникация",
        "THOUGHT": "Мышление, идеи, мнения и когнитивные процессы",
        "EMOTION": "Эмоции, чувства, переживания и психология",
        "DESIRE": "Желания, цели, мотивация и намерения",
        "ACTION": "Активные действия, движения и процессы",
        "CHANGE": "Изменения, развитие, трансформация и прогресс",
        "CAUSE": "Причины, следствия, логика и условия",
        "STATE": "Состояния, ситуации и условия бытия",
        "SPACE": "Пространство, география, архитектура и места",
        "MOVEMENT": "Передвижение, транспорт, путешествия и логистика",
        "TIME": "Время, календарь, расписание и периоды",
        "QUANTITY": "Количество, размеры, измерения и масштабы",
        "PHYSICAL_PROPERTIES": "Физические свойства, качества и характеристики",
        "NATURE": "Дикая природа, погода, стихия и ландшафты",
        "WEATHER": "Погода, климат, метеорология и природные явления",
        "EVENT": "События, мероприятия, происшествия и праздники",
        "CONFLICT": "Конфликты, споры, проблемы и кризисы",
        "LAW": "Закон, правосудие, правила и безопасность",
        "SAFETY": "Безопасность, защита, риски и оборона",
        "TECHNOLOGY": "Технологии, инновации, IT и гаджеты",
        "CREATION": "Творчество, искусство, дизайн и созидание",
        "OWNERSHIP": "Владение, собственность, имущество и права",
        "TRAVEL": "Путешествия, туризм, отели и поездки",
        "CLOTHING": "Одежда, мода, стиль и аксессуары",
        "HOME": "Дом, быт, интерьер, ремонт и домашнее хозяйство",
        "PERCEPTION": "Восприятие, органы чувств, звуки и образы",
        "HEALTH": "Здоровье, медицина, лечение и самочувствие",
        "EVALUATION": "Оценка, качество, мнение и суждения",
        "ABSTRACT": "Абстрактные понятия, философия и теория",
        "POSSIBILITY": "Возможности, вероятность, шанс и потенциал",
        "CRIME_JUSTICE": "Преступность, закон, полиция и правопорядок"
    }
    # Возвращаем перевод или очищенное оригинальное имя концепта, если его нет в словаре
    return mapping.get(concept_name.upper(), concept_name.replace("_", " ").lower())


def load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"⚠️ Файл {filename} не найден!")
    return {}


# --- 1. ГЛОБАЛЬНЫЕ БАЗЫ В ПАМЯТИ ---
PATTERNS_DB = load_json("grammar_patterns.json")

MARKERS_DB = {
    "en": load_json("grammar_markers_en.json"),
    "de": load_json("grammar_markers_de.json")
}

VOCAB_DB = {
    "en": load_json("vocab_en.json"),
    "de": load_json("vocab_de.json")
}


# --- 2. ПОИСК СЛОВ ПО ID ЧЕРЕЗ СЕМАНТИЧЕСКИЙ ГРАФ-ФИЛЬТР С ДЕТАЛЬНЫМ ЛОГИРОВАНИЕМ ---

def get_semantically_related_words(target_word: str, lang: str, level: str, pos: str, limit: int = 5) -> list:
    print(f"\n" + "🧩" + "=" * 50)
    print(f"🧩 [SEMANTIC GRAPH TRACE] Запрос семантического фильтра")
    print(f"   • Целевое слово: '{target_word}'")
    print(f"   • Язык: '{lang}' | Уровень: '{level}' | Часть речи: '{pos}' | Лимит: {limit}")
    print(f"   • Путь к базе графа: {DB_PATH}")

    if not DB_PATH.exists():
        print(f"❌ [SEMANTIC GRAPH ERROR] Файл базы семантического графа не найден по пути: {DB_PATH}")
        return []

    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()

        # 1. Находим концепты (категории), к которым принадлежит целевое слово
        cursor.execute("""
                       SELECT c.id, c.name
                       FROM global_words gw
                                JOIN word_concept_edges wce ON gw.id = wce.word_id
                                JOIN semantic_concepts c ON wce.concept_id = c.id
                       WHERE LOWER(gw.word) = LOWER(?)
                         AND LOWER(gw.lang) = LOWER(?)
                       """, (target_word.strip(), lang))

        concept_rows = cursor.fetchall()
        concept_ids = [row[0] for row in concept_rows]

        print(f"   • Найденные семантические группы (концепты) для слова '{target_word}':")
        if concept_rows:
            for cid, cname in concept_rows:
                print(f"     - ID концепта: {cid} | Название: '{cname}'")
        else:
            print(f"     ⚠️ Для слова '{target_word}' не найдено ни одного концепта в графе!")
            conn.close()
            return []

        # 2. Ищем другие слова из графа с теми же концептами, нужного уровня и части речи
        placeholders = ','.join(['?'] * len(concept_ids))
        query = f"""
            SELECT DISTINCT gw.id, gw.word, gw.cefr_level, gw.pos
            FROM global_words gw
            JOIN word_concept_edges wce ON gw.id = wce.word_id
            WHERE LOWER(gw.lang) = LOWER(?) 
              AND LOWER(gw.pos) = LOWER(?)
              AND UPPER(gw.cefr_level) = UPPER(?)
              AND LOWER(gw.word) != LOWER(?)
              AND wce.concept_id IN ({placeholders})
            ORDER BY RANDOM()
            LIMIT ?
        """

        # 🔥 ИСПРАВЛЕНИЕ: Оставляем pos как есть ('adjectives', 'verbs', 'nouns', 'adverbs'), как в базе
        pos_clean = pos

        params = [lang, pos_clean, level, target_word.strip()] + concept_ids + [limit * 2]
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        print(f"   • Кандидаты, найденные в графе по тем же концепты (pos='{pos_clean}', уровень='{level}'):")
        print(f"     - Всего найдено сырых совпадений: {len(rows)}")
        formatted_rows = [{"id": row[0], "word": row[1], "level": row[2], "pos": row[3]} for row in rows]
        for item in formatted_rows:
            print(
                f"       * ID: {item['id']} | Слово: '{item['word']}' | Уровень: {item['level']} | Позиция: {item['pos']}")

        print("🧩" + "=" * 50 + "\n")
        return [{"id": item["id"], "word": item["word"]} for item in formatted_rows[:limit]]
    except Exception as e:
        print(f"❌ [SEMANTIC GRAPH EXCEPTION] Ошибка запроса к семантическому графу по ID: {e}")
        return []


# --- 3. ЛОГИКА ВЫБОРКИ (СУДЬЯ) ---

def pick_least_used(items: list, stats_dict: dict, count: int = 1):
    """Выбирает элементы, которые использовались реже всего (на основе ID)."""
    if not items:
        return []

    def get_key(item):
        return str(item.get("id", item)) if isinstance(item, dict) else str(item)

    sorted_items = sorted(items, key=lambda i: stats_dict.get(get_key(i), 0))
    min_usage_val = stats_dict.get(get_key(sorted_items[0]), 0)
    min_count_items = [i for i in sorted_items if stats_dict.get(get_key(i), 0) == min_usage_val]

    if len(min_count_items) >= count:
        return random.sample(min_count_items, count)
    else:
        return sorted_items[:count]


def build_background_vocab(user_level: str, pattern_mix: dict, lang: str, bg_stats: dict,
                           target_word: str = None) -> list:
    """Собирает фоновый набор слов, используя семантический граф как фильтр по ID с детальным логированием."""
    background_objs = []
    lang_vocab = VOCAB_DB.get(lang, {})

    clean_level = str(user_level).strip().upper().replace("+", "")
    level_dict = lang_vocab.get(clean_level, {})

    print(f"\n" + "📊" + "=" * 60)
    print(f"📊 [BACKGROUND VOCAB BUILDER] Детальный анализ сборки фона")
    print(f"   • Целевое слово: '{target_word}'")
    print(f"   • Уровень пользователя (исходный): '{user_level}' -> (нормализованный): '{clean_level}'")
    print(f"   • Язык: '{lang}'")
    print(f"   • Запрошенный паттерн микса частей речи: {pattern_mix}")
    print(
        f"   • Словарь уровня {clean_level} содержит ключи частей речи: {list(level_dict.keys()) if level_dict else 'ПУСТО'}")

    for part_of_speech, required_count in pattern_mix.items():
        print(f"\n   --------------------------------------------------")
        print(f"   📌 Обработка части речи: '{part_of_speech}' | Требуется отобрать: {required_count}")
        if required_count <= 0:
            print(f"      ➔ Пропуск (требуемое количество 0)")
            continue

        selected = []

        # Шаг 1: Используем семантический граф как фильтр для получения ID подходящих слов
        if target_word:
            print(f"      🔍 Шаг 1: Запрос семантического фильтра из графа для части речи '{part_of_speech}'...")
            related_words = get_semantically_related_words(target_word, lang, clean_level, part_of_speech,
                                                           limit=required_count * 3)
            if related_words:
                print(
                    f"         ➔ Граф вернул {len(related_words)} кандидатов. Применяем критерий наименьшей используемости (pick_least_used)...")
                selected = pick_least_used(related_words, bg_stats, min(required_count, len(related_words)))
                print(f"         ➔ Успешно отобрано из графа: {len(selected)} слов(а): {[w['word'] for w in selected]}")
            else:
                print(
                    f"         ⚠️ Граф не вернул подходящих слов для части речи '{part_of_speech}'. Переходим к фолбэку.")

        # Шаг 2: Фолбэк на основной словарь при нехватке
        if len(selected) < required_count:
            needed = required_count - len(selected)
            print(f"      🔍 Шаг 2: Фолбэк на основной словарь `vocab_{lang}.json` (не хватает еще {needed} слов)...")
            available_words = level_dict.get(part_of_speech, [])
            print(
                f"         ➔ Всего доступно в словаре для уровня {clean_level} / {part_of_speech}: {len(available_words)} слов")

            selected_ids = {str(w.get("id", w)) if isinstance(w, dict) else str(w) for w in selected}
            filtered_available = [w for w in available_words if
                                  (str(w.get("id", w)) if isinstance(w, dict) else str(w)) not in selected_ids]
            print(f"         ➔ Доступно после исключения уже выбранных: {len(filtered_available)} слов")

            if filtered_available:
                fallback_selected = pick_least_used(filtered_available, bg_stats, min(needed, len(filtered_available)))
                selected.extend(fallback_selected)
                print(
                    f"         ➔ Отобрано из основного словаря (фолбэк): {len(fallback_selected)} слов(а): {[w.get('word', w) if isinstance(w, dict) else w for w in fallback_selected]}")
            else:
                print(f"         ❌ Внимание: в словаре не осталось доступных слов для части речи '{part_of_speech}'!")

        print(f"      ✅ Итого отобрано для '{part_of_speech}': {len(selected)} из {required_count} требуемых.")
        background_objs.extend(selected)

    print(f"\n📊 [BACKGROUND VOCAB BUILDER] Итог сбора фона:")
    print(f"   • Всего собрано объектов фоновых слов: {len(background_objs)}")
    print("📊" + "=" * 60 + "\n")
    return background_objs


def generate_task_payload(target_word: str, rule_name: str, rule_pattern_tag: str, user_level: str, lang: str,
                          marker_stats: dict = None, bg_stats: dict = None) -> dict:
    if marker_stats is None: marker_stats = {}
    if bg_stats is None: bg_stats = {}

    print(f"\n" + "🔥" * 35)
    print(f"🚀 [GENERATE_TASK_PAYLOAD] СТАРТ ФОРМИРОВАНИЯ ЗАДАНИЯ")
    print(f"📚 ГРАММАТИЧЕСКОЕ ПРАВИЛО: >>> '{rule_name}' <<<")
    print(f"🎯 ЦЕЛЕВОЕ СЛОВО: '{target_word}'")
    print(f"   • Тег паттерна: '{rule_pattern_tag}' | Уровень: '{user_level}' | Язык: '{lang}'")
    print("🔥" * 35)

    # 🔥 ОПРЕДЕЛЯЕМ ТЕМУ ИЗ СЕМАНТИЧЕСКОГО ГРАФА ДЛЯ ЦЕЛЕВОГО СЛОВА
    target_theme = "Общая лексика и повседневное общение" # Фолбэк по умолчанию
    try:
        if DB_PATH.exists():
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT c.name
                FROM global_words gw
                JOIN word_concept_edges wce ON gw.id = wce.word_id
                JOIN semantic_concepts c ON wce.concept_id = c.id
                WHERE LOWER(gw.word) = LOWER(?) AND LOWER(gw.lang) = LOWER(?)
                LIMIT 1
            """, (target_word.strip(), lang))
            row = cursor.fetchone()
            conn.close()
            if row:
                raw_concept = row[0]
                # Превращаем технический ID/название концепта в красивую тему на русском
                target_theme = translate_concept_to_theme(raw_concept)
    except Exception as e:
        print(f"⚠️ Ошибка при автоопределении темы из графа: {e}")

    print(f"🏷️ [DYNAMIC THEME] Определена жесткая тема: '{target_theme}'")

    rule_lower = rule_name.lower()
    pattern_mix = {}

    if "adjective" in rule_lower or "comparative" in rule_lower or "superlative" in rule_lower:
        pattern_mix = {"adjectives": 3, "nouns": 1, "verbs": 1, "adverbs": 0}
    elif "noun" in rule_lower or "article" in rule_lower or "plural" in rule_lower:
        pattern_mix = {"adjectives": 1, "nouns": 3, "verbs": 1, "adverbs": 0}
    elif "verb" in rule_lower or "tense" in rule_lower or "past" in rule_lower or "present" in rule_lower or "future" in rule_lower:
        pattern_mix = {"adjectives": 1, "nouns": 1, "verbs": 2, "adverbs": 1}
    else:
        pattern_config = PATTERNS_DB.get(rule_pattern_tag, PATTERNS_DB.get("default_mix"))
        pattern_mix = pattern_config.get("mix", {}) if isinstance(pattern_config, dict) else {"verbs": 1, "nouns": 2, "adjectives": 1}

    lang_markers = MARKERS_DB.get(lang, {})
    marker_config = lang_markers.get(rule_name)

    mandatory_marker = None
    if isinstance(marker_config, dict):
        available_markers = marker_config.get("markers", [])
        if available_markers:
            mandatory_marker = pick_least_used(available_markers, marker_stats, count=1)[0]

    background_objs = build_background_vocab(user_level, pattern_mix, lang, bg_stats, target_word=target_word)

    res_words = [w["word"] if isinstance(w, dict) else w for w in background_objs]
    used_ids = [w.get("id", 0) if isinstance(w, dict) else 0 for w in background_objs]

    print(f"\n📦 [PAYLOAD FINAL SUMMARY]")
    print(f"   • Финальные фоновые слова (текст): {res_words}")
    print(f"   • Финальные фоновые слова (ID для трекинга в БД): {used_ids}")
    print(f"   • Обязательный маркер: {mandatory_marker}")
    print(f"   • Тема: {target_theme}")
    print("=" * 70 + "\n")

    return {
        "target_word": target_word,
        "rule_name": rule_name,
        "mandatory_marker": mandatory_marker,
        "background_words": res_words,
        "used_background_ids": used_ids,
        "target_theme": target_theme  # Передаем тему дальше
    }


def check_word_level_and_fallback(target_word: str, user_level: str, lang: str) -> dict:
    lang_vocab = VOCAB_DB.get(lang, {})

    clean_word = target_word.split('«')[-1].split('»')[0].strip().lower()
    if not clean_word:
        clean_word = target_word.strip().lower()

    if lang == "de":
        is_gibberish = not bool(re.match(r'^[a-zäöüß\s\-]+$', clean_word))
    else:
        is_gibberish = not bool(re.match(r'^[a-z\s\-]+$', clean_word))

    user_level_upper = user_level.strip().upper().replace("А", "A")
    user_level_dict = lang_vocab.get(user_level_upper, {})

    # Оставляем только защиту от откровенного бреда (ghbdtn)
    if is_gibberish:
        available_words = user_level_dict.get("verbs", []) + user_level_dict.get("nouns", []) + user_level_dict.get(
            "adjectives", [])
        if available_words:
            chosen = random.choice(available_words)
            fallback_word = chosen["word"] if isinstance(chosen, dict) else chosen
        else:
            fallback_word = "server"

        warning_text = (
            f"❌ Слово <b>«{clean_word}»</b> введено некорректно. "
            f"Вместо него выбрано: <b>«{fallback_word}»</b>."
        )
        return {"is_appropriate": False, "word": fallback_word, "fallback_word": fallback_word, "message": warning_text}

    # Если слово нормальное — просто пропускаем его дальше!
    # Никаких предупреждений, поиска по базе и лишнего текста.
    return {"is_appropriate": True, "word": clean_word, "fallback_word": clean_word, "message": ""}