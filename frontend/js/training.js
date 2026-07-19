// ==========================================
// ФАЙЛ: frontend/js/training.js
// ==========================================

let trainingState = {
    activeRound: [],
    nextRound: [],
    currentIndex: 0,
    swapped: true,
    totalWords: 0,
    completedWords: 0
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 🔥 ГЛАВНОЕ МЕНЮ ТРЕНИРОВКИ С "ДОРОГИМИ" ПОЛУПРОЗРАЧНЫМИ КНОПКАМИ
function showTrainingMenu() {
    window.currentAppMode = 'training';
    setAppHeader('📚 Тренировка', true);

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';


    document.getElementById('chat-messages').innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 25px 20px; margin-top: 20px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🧠</div>
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 10px;">Режим Тренировки</div>
            <div style="font-size: 14px; color: var(--hint-color); margin-bottom: 25px;">Выбери количество слов для повторения:</div>
            
            <!-- Сетка с кнопками в стиле iOS / Telegram -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
                <button onclick="startTraining(3)" style="padding: 16px 10px; background-color: rgba(0, 122, 255, 0.1); border: 1px solid rgba(0, 122, 255, 0.3); border-radius: 12px; color: #007aff; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.1s;">3 слова</button>
                
                <button onclick="startTraining(5)" style="padding: 16px 10px; background-color: rgba(175, 82, 222, 0.1); border: 1px solid rgba(175, 82, 222, 0.3); border-radius: 12px; color: #af52de; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.1s;">5 слов</button>
                
                <button onclick="startTraining(8)" style="padding: 16px 10px; background-color: rgba(255, 149, 0, 0.1); border: 1px solid rgba(255, 149, 0, 0.3); border-radius: 12px; color: #ff9500; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.1s;">8 слов</button>
                
                <button onclick="startTraining(10)" style="padding: 16px 10px; background-color: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); border-radius: 12px; color: #ff3b30; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.1s;">10 слов</button>
            </div>
        </div>
    `;
}

function toggleSwap() {
    trainingState.swapped = !trainingState.swapped;
    if (trainingState.activeRound.length > 0 && trainingState.currentIndex < trainingState.activeRound.length) {
        showCurrentWord();
    }
}
function startTraining(count) {
    document.getElementById('input-container').style.display = 'flex';
    document.getElementById('user-input').placeholder = "Перевод...";

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);"><i>⏳ Загрузка слов...</i></div>';

    apiFetch(`/train/start?chat_id=${user.id}&count=${count}`)
        .then(data => {
            // 🔥 ОХРАННИК: Если пользователь уже ушел из тренировки, обрываем!
            if (window.currentAppMode !== 'training') return;

            if (data.success && data.words && data.words.length > 0) {
                trainingState.activeRound = shuffleArray(data.words.map(w => ({ ...w, correctGuesses: 0 })));
                trainingState.nextRound = [];
                trainingState.currentIndex = 0;
                trainingState.totalWords = data.words.length;
                trainingState.completedWords = 0;

                showCurrentWord();
            } else {
                chatContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Нет слов для тренировки.</div>';
            }
        })
        .catch(err => {
            if (window.currentAppMode !== 'training') return; // Защита для ошибки
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети при загрузке.</div>`;
        });
}

function showFlashMessage(htmlContent, delay = 1000) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-top: 20px;">
            ${htmlContent}
        </div>`;

    setTimeout(() => {
        // 🔥 ОХРАННИК: Если пока висело сообщение, юзер ушел в другое меню — останавливаем процесс!
        if (window.currentAppMode !== 'training') return;

        trainingState.currentIndex++;
        showCurrentWord();
    }, delay);
}

// 🔥 НОВЫЙ ДИЗАЙН КАРТОЧКИ СЛОВА С КНОПКАМИ ВНИЗУ
function showCurrentWord() {
    const chatContainer = document.getElementById('chat-messages');

    if (trainingState.currentIndex >= trainingState.activeRound.length) {
        if (trainingState.nextRound.length === 0) {
            chatContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px;">
                    <div style="font-size: 60px; margin-bottom: 15px;">🎉</div>
                    <div style="font-size: 22px; font-weight: bold; color: var(--text-color);">Тренировка завершена!</div>
                    <div style="font-size: 14px; color: var(--hint-color); margin-top: 10px;">Выучено слов: ${trainingState.totalWords}</div>
                </div>`;
            document.getElementById('input-container').style.display = 'none';
            return;
        } else {
            trainingState.activeRound = shuffleArray([...trainingState.nextRound]);
            trainingState.nextRound = [];
            trainingState.currentIndex = 0;
        }
    }

    const wordObj = trainingState.activeRound[trainingState.currentIndex];
    const question = trainingState.swapped ? wordObj.ru : wordObj.foreign;
    const leftToGuess = 3 - (wordObj.correctGuesses || 0);
    const wordsLeft = trainingState.totalWords - trainingState.completedWords;

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: 20px;">
            
            <!-- Сама карточка слова -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; background-color: var(--secondary-bg-color); border-radius: 16px; border: 1px solid rgba(112, 132, 153, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; position: relative;">
                <div style="position: absolute; top: 15px; left: 0; width: 100%; text-align: center; font-size: 12px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px;">
                    Осталось слов: <b>${wordsLeft}</b> из ${trainingState.totalWords}
                </div>

                <div style="font-size: 32px; font-weight: bold; color: var(--text-color); text-align: center; margin-top: 20px; margin-bottom: 25px; word-wrap: break-word; width: 100%;">${question}</div>
                
                <div style="font-size: 14px; color: var(--hint-color); background: rgba(112, 132, 153, 0.1); padding: 6px 14px; border-radius: 12px;">
                    Осталось угадать: <b>${leftToGuess}</b>
                </div>
            </div>

            <!-- Блок с кнопками "Помощь" и "Поменять" -->
            <div style="display: flex; gap: 10px; width: 100%;">
                <button onclick="showHelp()" style="flex: 1; padding: 12px; background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: 12px; color: #ff9f0a; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">🆘 Подсказка</button>
                <button onclick="toggleSwap()" style="flex: 1; padding: 12px; background: rgba(112, 132, 153, 0.1); border: 1px solid rgba(112, 132, 153, 0.2); border-radius: 12px; color: var(--text-color); font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">🔀 Поменять</button>
            </div>

        </div>
    `;
}

function handleTrainingInput(text) {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;

        const wordObj = trainingState.activeRound[trainingState.currentIndex];
        const correctAnswer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');
        const isCorrect = text.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        if (isCorrect) {
            wordObj.correctGuesses = (wordObj.correctGuesses || 0) + 1;

            if (wordObj.correctGuesses >= 3) {
                trainingState.completedWords++;
                showFlashMessage(`<div style="font-size: 50px; margin-bottom: 10px;">✅</div><div style="font-size: 22px; font-weight: bold; color: #34c759; text-align: center;">Слово выучено!</div>`, 1000);
                apiFetch('/train/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: true }) });
            } else {
                showFlashMessage(`<div style="font-size: 50px; margin-bottom: 10px;">✅</div><div style="font-size: 22px; font-weight: bold; color: #34c759; text-align: center;">Верно!</div>`, 800);
                trainingState.nextRound.push({ ...wordObj });
            }
        } else {
            showFlashMessage(`<div style="font-size: 50px; margin-bottom: 10px;">❌</div><div style="font-size: 16px; color: #ff3b30; text-align: center;">Ошибка! Правильно:</div><div style="font-size: 26px; font-weight: bold; color: var(--text-color); margin-top: 10px; text-align: center;">${correctAnswer}</div>`, 2000);
            apiFetch('/train/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: false }) });
            wordObj.correctGuesses = 0;
            trainingState.nextRound.push({ ...wordObj });
        }
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
    }
}

function showHelp() {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;

        const wordObj = trainingState.activeRound[trainingState.currentIndex];
        const answer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');

        showFlashMessage(`<div style="font-size: 50px; margin-bottom: 10px;">💡</div><div style="font-size: 16px; color: var(--hint-color); text-align: center;">Подсказка:</div><div style="font-size: 28px; font-weight: bold; color: var(--button-color); margin-top: 5px; text-align: center;">${answer}</div>`, 2000);

        apiFetch('/train/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: false }) });

        wordObj.correctGuesses = 0;
        trainingState.nextRound.push({ ...wordObj });
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
    }
}