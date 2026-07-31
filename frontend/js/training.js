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

// 🔥 ГЛАВНОЕ МЕНЮ ТРЕНИРОВКИ
function showTrainingMenu() {
    window.currentAppMode = 'training';
    setAppHeader('Тренировка слов', true);

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    document.getElementById('chat-messages').innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; margin-top: 5px; text-align: center;">
            <div style="margin-bottom: 12px;">
                 ${typeof APP_ICONS !== 'undefined' && APP_ICONS.training ? APP_ICONS.training : '⏱️'}
            </div>
            <div style="font-size: 20px; font-weight: bold; color: var(--text-color); margin-bottom: 8px;">Режим Тренировки</div>
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.45); margin-bottom: 25px;">Выбери количество слов для повторения:</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
                <button onclick="startTraining(3)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">3 слова</button>
                <button onclick="startTraining(5)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">5 слов</button>
                <button onclick="startTraining(8)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">8 слов</button>
                <button onclick="startTraining(10)" style="height: 46px; padding: 0 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-sizing: border-box;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">10 слов</button>
            </div>

            <!-- Фиолетовая плашка со светло-светло-фиолетовым текстом -->
            <div style="width: 100%; margin-top: 20px;">
                <button onclick="showFullDictionary()" class="btn-glass btn-glass-cream">
                    <span style="display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                        ${typeof APP_ICONS !== 'undefined' && APP_ICONS.dictionary ? APP_ICONS.dictionary : '📚'}
                    </span> 
                    Выбрать из словаря
                </button>
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
    const inputEl = document.getElementById('user-input');
    inputEl.placeholder = "Перевод...";

    setTimeout(() => inputEl.focus(), 10);

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);"><i>⏳ Загрузка слов...</i></div>';

    apiFetch(`/train/start?chat_id=${user.id}&count=${count}`)
        .then(data => {
            if (window.currentAppMode !== 'training') return;

            if (data.success && data.words && data.words.length > 0) {
                trainingState.activeRound = shuffleArray(data.words.map(w => ({ ...w, correctGuesses: 0, hintShown: false })));
                trainingState.nextRound = [];
                trainingState.currentIndex = 0;
                trainingState.totalWords = data.words.length;
                trainingState.completedWords = 0;

                showCurrentWord();

                setTimeout(() => {
                    const activeInput = document.getElementById('user-input');
                    if (activeInput) activeInput.focus();
                }, 50);

            } else {
                chatContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Нет слов для тренировки.</div>';
            }
        })
        .catch(err => {
            if (window.currentAppMode !== 'training') return;
            chatContainer.innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Ошибка сети при загрузке.</div>`;
        });
}

function showFlashMessage(htmlContent, delay = 1000) {
    const chatContainer = document.getElementById('chat-messages');

    // 🔥 Зафиксировали высоту ошибки тоже в 260px, чтобы она не прыгала
    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; overflow: hidden;">
                ${htmlContent}
            </div>
        </div>`;

    setTimeout(() => {
        if (window.currentAppMode !== 'training') return;
        trainingState.currentIndex++;
        showCurrentWord();
    }, delay);
}

// 🔥 КАРТОЧКА СЛОВА (с динамическим размером шрифта)
function showCurrentWord() {
    const chatContainer = document.getElementById('chat-messages');

    if (trainingState.currentIndex >= trainingState.activeRound.length) {
        if (trainingState.nextRound.length === 0) {

            const previousWords = window.userProfile ? (window.userProfile.words_today || 0) : 0;
            const goal = window.userProfile?.words_per_day || 5;

            const oldPercent = Math.min(Math.round((previousWords / goal) * 100), 100);
            const newWords = previousWords + trainingState.totalWords;
            const newPercent = Math.min(Math.round((newWords / goal) * 100), 100);

            const pbTitle = (window.userProfile && window.userProfile.language === 'de') ? 'Wortschatz lernen' : 'Изучение слов';

            if (window.userProfile) {
                window.userProfile.words_today = newWords;
            }

            apiFetch('/train/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.id,
                    count: trainingState.totalWords
                })
            });

            chatContainer.innerHTML = `
                <div class="pb-main-container" style="flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-top: 15px; padding: 30px 20px;">
                    
                    <div class="pb-avatar" style="margin: 0 auto 20px auto; width: 90px; height: 90px;">
                        <img src="frontend/img/mentor.jpg" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <div style="font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">Поздравляем!</div>
                    <div style="font-size: 15px; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-bottom: 25px;">Тренировка завершена</div>

                    <div class="pb-row" style="width: 100%;">
                        <div class="pb-header">
                            <span class="pb-title">${pbTitle}</span>
                            <span class="pb-value" id="final-pb-value">${oldPercent}%</span>
                        </div>
                        <div class="pb-track">
                            <div class="pb-fill" id="final-pb-fill" style="width: ${oldPercent}%; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; color: #34d399; margin-top: 20px; font-weight: 600;">+${trainingState.totalWords} слов выучено</div>
                </div>`;

            document.getElementById('input-container').style.display = 'none';

            setTimeout(() => {
                const bar = document.getElementById('final-pb-fill');
                if (bar) bar.style.width = `${newPercent}%`;

                const valueEl = document.getElementById('final-pb-value');
                const duration = 1200;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);

                    const currentVal = Math.round(oldPercent + (newPercent - oldPercent) * easeProgress);
                    if (valueEl) valueEl.innerText = `${currentVal}%`;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }
                requestAnimationFrame(updateCounter);

            }, 100);

            setTimeout(() => {
                if (typeof exitToMainMenu === 'function') {
                    exitToMainMenu();
                }
            }, 5000);

            return;
        } else {
            trainingState.activeRound = shuffleArray([...trainingState.nextRound.map(w => ({ ...w, hintShown: false }))]);
            trainingState.nextRound = [];
            trainingState.currentIndex = 0;
        }
    }

    const wordObj = trainingState.activeRound[trainingState.currentIndex];
    const basePrompt = trainingState.swapped ? wordObj.ru : wordObj.foreign;

    let question = basePrompt;
    if (wordObj.hintShown) {
        const targetAnswer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');
        if (targetAnswer.length > 2) {
            question = targetAnswer.substring(0, 2) + '...';
        } else {
            question = targetAnswer;
        }
    }

    // 🔥 ЛОГИКА ДИНАМИЧЕСКОГО ШРИФТА (Уменьшается, если текст длинный)
    const textLen = question.length;
    let dynamicFontSize = '28px'; // Базовый размер стал меньше (был 32px)
    if (textLen > 15) dynamicFontSize = '24px';
    if (textLen > 25) dynamicFontSize = '20px';
    if (textLen > 35) dynamicFontSize = '17px';
    if (textLen > 50) dynamicFontSize = '14px';

    const leftToGuess = 3 - (wordObj.correctGuesses || 0);
    const wordsLeft = trainingState.totalWords - trainingState.completedWords;

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            
            <!-- 🔥 ЖЕСТКО ЗАФИКСИРОВАНА ВЫСОТА height: 260px И ДОБАВЛЕН overflow: hidden -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 260px; min-height: 260px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px 20px; position: relative; box-sizing: border-box; width: 100%; overflow: hidden;">
                
                <div style="position: absolute; top: 15px; left: 0; width: 100%; text-align: center; font-size: 12px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px;">
                    Осталось слов: <b>${wordsLeft}</b> из ${trainingState.totalWords}
                </div>

                <!-- 🔥 ДОБАВЛЕН ID ДЛЯ УДОБНОГО ПОИСКА И ДИНАМИЧЕСКИЙ РАЗМЕР -->
                <div id="training-word-display" style="font-size: ${dynamicFontSize}; font-weight: bold; color: ${wordObj.hintShown ? 'var(--button-color)' : 'var(--text-color)'}; text-align: center; margin-top: 30px; margin-bottom: 10px; word-wrap: break-word; overflow-wrap: break-word; width: 100%; flex-grow: 1; display: flex; align-items: center; justify-content: center; line-height: 1.2;">
                    ${question}
                </div>
                
                <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px 14px; border-radius: 12px; margin-bottom: 20px;">
                    Осталось угадать: <b style="color: var(--text-color);">${leftToGuess}</b>
                </div>

                <div style="display: flex; gap: 10px; width: 100%; margin-top: auto;">
                    <button onclick="showHelp()" onmousedown="event.preventDefault()" class="btn-glass-orange-soft">
                        ${wordObj.hintShown ? 'Скрыть' : 'Подсказка'}
                    </button>
                    
                    <button onclick="toggleSwap()" onmousedown="event.preventDefault()" class="btn-glass-secondary">
                        Поменять
                    </button>
                </div>
            </div>

        </div>
    `;
}

function handleTrainingInput(text) {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;

        if (trainingState.isAnimating) return;

        const inputEl = document.getElementById('user-input');
        const chatContainer = document.getElementById('chat-messages');

        if (chatContainer.lastElementChild && chatContainer.lastElementChild.style.alignSelf === 'flex-end') {
            chatContainer.lastElementChild.remove();
        }

        const wordObj = trainingState.activeRound[trainingState.currentIndex];
        const correctAnswer = String(trainingState.swapped ? wordObj.foreign : wordObj.ru || '');
        const isCorrect = text.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        if (isCorrect) {
            trainingState.isAnimating = true;
            wordObj.correctGuesses = (wordObj.correctGuesses || 0) + 1;

            if (wordObj.correctGuesses >= 3) {
                trainingState.completedWords++;
                apiFetch('/train/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: true }) });
            } else {
                trainingState.nextRound.push({ ...wordObj });
            }

            const willFinish = (trainingState.currentIndex + 1 >= trainingState.activeRound.length) && (trainingState.nextRound.length === 0);

            // 🔥 Теперь ищем слово по четкому ID, а не по стилю 32px
            const wordDiv = document.getElementById('training-word-display');
            if (wordDiv) {
                // Вычисляем размер шрифта для правильного ответа, чтобы он влез в карточку
                const ansLen = correctAnswer.length;
                let newSize = '28px';
                if (ansLen > 15) newSize = '24px';
                if (ansLen > 25) newSize = '20px';
                if (ansLen > 35) newSize = '17px';
                if (ansLen > 50) newSize = '14px';

                wordDiv.innerText = correctAnswer;
                wordDiv.style.fontSize = newSize; // 🔥 Применяем новый размер
                wordDiv.style.transition = 'all 0.2s ease-out';
                wordDiv.style.color = '#34c759';
                wordDiv.style.textShadow = '0 0 15px rgba(52, 199, 89, 0.4)';
                wordDiv.style.transform = 'scale(1.05)';
            }

            if (inputEl) {
                inputEl.value = '';
                if (willFinish) {
                    inputEl.blur();
                } else {
                    setTimeout(() => inputEl.focus(), 10);
                }
            }

            setTimeout(() => {
                trainingState.currentIndex++;
                trainingState.isAnimating = false;
                showCurrentWord();
            }, 400);

        } else {
            if (inputEl) {
                inputEl.value = '';
                setTimeout(() => inputEl.focus(), 10);
            }

            // 🔥 Динамический шрифт для правильного ответа внутри окна ошибки
            let flashSize = '26px';
            if (correctAnswer.length > 15) flashSize = '22px';
            if (correctAnswer.length > 25) flashSize = '18px';
            if (correctAnswer.length > 35) flashSize = '15px';

            showFlashMessage(`
                <div style="font-size: 40px; margin-bottom: 5px;">❌</div>
                <div style="font-size: 14px; color: #ff3b30; text-align: center;">Ошибка! Правильно:</div>
                <div style="font-size: ${flashSize}; font-weight: bold; color: var(--text-color); margin-top: 10px; text-align: center; word-wrap: break-word; width: 100%; box-sizing: border-box; line-height: 1.2;">${correctAnswer}</div>
            `, 2000);

            apiFetch('/train/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: false }) });

            trainingState.nextRound.push({ ...wordObj });
        }
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
        trainingState.isAnimating = false;
    }
}

function showHelp() {
    try {
        if (trainingState.currentIndex >= trainingState.activeRound.length) return;

        const wordObj = trainingState.activeRound[trainingState.currentIndex];

        wordObj.hintShown = !wordObj.hintShown;

        if (wordObj.hintShown) {
            wordObj.correctGuesses = 0;
            apiFetch('/train/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: user.id, word_id: wordObj.id, is_correct: false })
            });
        }

        const inputEl = document.getElementById('user-input');
        if (inputEl) {
            setTimeout(() => inputEl.focus(), 10);
        }

        showCurrentWord();
    } catch (error) {
        document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; padding: 20px;">⚠️ Внутренняя ошибка скрипта.</div>`;
    }
}