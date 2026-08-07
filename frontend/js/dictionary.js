// ==========================================
// ФАЙЛ: frontend/js/dictionary.js
// ==========================================

let dictionaryWords = [];
let filteredDictionaryWords = [];
let dictionaryCurrentPage = 0;
let isDictEditMode = false;
const WORDS_PER_PAGE = 30;

let selectedDictWords = new Set();
let currentWordMeanings = [];

function showFullDictionary() {
    window.currentAppMode = 'dictionary';

    setAppHeader('Мой словарь', true);

    selectedDictWords.clear();
    isDictEditMode = false;

    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    // 🔥 Бесцветный контурный карандаш, развернутый в другую сторону, в правом краю шапки
    const actionsEl = document.getElementById('top-bar-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `
            <button id="dict-edit-mode-btn" onclick="toggleDictEditMode()" style="width: 36px; height: 36px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); outline: none; transition: opacity 0.2s;" title="Редактировать словарь">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: scaleX(-1); opacity: 0.85; color: var(--text-color);">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
            </button>
        `;
    }

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);"><i>⏳ Загрузка словаря...</i></div>';

    ensureEditTooltipExists();

    apiFetch(`/words/all?chat_id=${user.id}`)
        .then(data => {
            if (data.success && data.words && data.words.length > 0) {
                dictionaryWords = data.words.reverse();
                filteredDictionaryWords = [...dictionaryWords];
                dictionaryCurrentPage = 0;

                const currentLang = (window.userProfile && window.userProfile.language) || 'en';
                const goText = currentLang === 'de' ? 'GO ÜBEN 🚀' : 'GO TRAINING 🚀';

                chatContainer.innerHTML = `
                    <div style="font-size: 13px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 5px;">
                        Всего слов: <span id="dict-count">${dictionaryWords.length}</span>
                    </div>
                    
          <!-- ПОИСК В СТИЛЕ КАРТОЧЕК ГЛАВНОГО ЭКРАНА -->
                    <div style="position: sticky; top: 0; padding: 5px 0 15px 0; z-index: 10; margin-top: -10px;">
                        
                            <div class="feature-input-row">
<input type="text" id="dict-search" class="glass-input" style="background: rgba(15, 20, 35, 0.8);" oninput="filterDictionary(this.value)" placeholder="🔍 Поиск по слову или переводу...">                            </div>
                       
                    </div>
                    
                    <div id="dict-list-wrapper"></div>
                    
                    <!-- ПАНЕЛЬ МУЛЬТИВЫБОРА -->
                    <div id="dict-selection-panel" style="display: none; position: sticky; bottom: 20px; background: linear-gradient(135deg, rgba(55, 80, 115, 0.95) 0%, rgba(30, 45, 70, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; padding: 15px 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), inset 1px 1px 0 rgba(255, 255, 255, 0.25), inset -1px -1px 0 rgba(0, 0, 0, 0.4); z-index: 100; flex-direction: row; justify-content: space-between; align-items: center; border: 1px solid rgba(255, 255, 255, 0.2); margin-top: 20px; opacity: 0; transition: opacity 0.3s; pointer-events: none;">
                        <div onclick="clearDictSelection()" style="position: absolute; top: -8px; left: -8px; width: 22px; height: 22px; background: rgba(30, 45, 70, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: rgba(255, 255, 255, 0.7); font-size: 10px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: all 0.2s;" onmousedown="this.style.transform='scale(0.9)'; this.style.color='#fff';" onmouseup="this.style.transform='scale(1)'; this.style.color='rgba(255,255,255,0.7)';" onmouseleave="this.style.transform='scale(1)'; this.style.color='rgba(255,255,255,0.7)';">✕</div>                        
                        <div style="color: white; font-weight: bold; font-size: 15px; margin-left: 6px;">Выбрано: <span id="dict-sel-count">0</span></div>
                        <button onclick="startSelectedTraining()" style="background: rgba(255, 159, 10, 0.15); border: 1px solid rgba(255, 159, 10, 0.3); color: #ff9f0a; padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; text-transform: uppercase; cursor: pointer; transition: transform 0.1s, background 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                            ${goText}
                        </button>
                    </div>
                `;

                renderDictionaryPage();
            } else {
                chatContainer.innerHTML = `
                    <div style="text-align:center; padding: 20px; background: var(--secondary-bg-color); border-radius: 16px; margin-top: 20px;">
                        <div style="font-size: 40px; margin-bottom: 10px;">📭</div>
                        <div style="color: var(--text-color);">Словарь пока пуст. Самое время добавить новое слово! ✍️</div>
                    </div>`;
            }
        })
        .catch(err => {
            console.error(err);
            chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: #ff3b30;"><i>❌ Ошибка при загрузке словаря.</i></div>';
        });
}

function filterDictionary(query) {
    query = query.toLowerCase().trim();

    filteredDictionaryWords = dictionaryWords.filter(w => {
        let foreign = (w.word_foreign || w.foreign || w[0] || "").toLowerCase();
        let ru = (w.word_ru || w.ru || w[1] || "").toLowerCase();
        return foreign.includes(query) || ru.includes(query);
    });

    const countSpan = document.getElementById('dict-count');
    if (countSpan) countSpan.innerText = filteredDictionaryWords.length;

    const listWrapper = document.getElementById('dict-list-wrapper');
    if (listWrapper) listWrapper.innerHTML = '';
    dictionaryCurrentPage = 0;

    renderDictionaryPage();
}

function renderDictionaryPage() {
    const listWrapper = document.getElementById('dict-list-wrapper');
    if (!listWrapper) return;

    if (dictionaryCurrentPage === 0) {
        listWrapper.innerHTML = '';
    }

    const end = (dictionaryCurrentPage + 1) * WORDS_PER_PAGE;
    const pageWords = filteredDictionaryWords.slice(0, end);

    if (pageWords.length === 0) {
        listWrapper.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);">Ничего не найдено 🤷‍♂️</div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column;">';

    pageWords.forEach(w => {
        let foreign = w.word_foreign || w.foreign || w[0];
        let ru = w.word_ru || w.ru || w[1];
        let score = w.score !== undefined ? w.score : (w[2] || 0);
        let percent = Math.round((score / 5) * 100);

        // Определяем нужный класс CSS вместо inline-цветов
        let percentClass = 'percent-0';
        if (percent >= 80) {
            percentClass = 'percent-high';
        } else if (percent >= 40) {
            percentClass = 'percent-mid';
        } else if (percent > 0) {
            percentClass = 'percent-low';
        }
        let escapedWord = foreign.replace(/'/g, "\\'");

        // Новая надпись
        let btnText = 'TO TRAINING';

        let isSelected = selectedDictWords.has(foreign);
        let clickAction = isDictEditMode ? `openEditTranslationTooltip('${escapedWord}')` : `openWordDetails('${escapedWord}')`;

      let rightBlockHtml = '';
        if (isDictEditMode) {
            rightBlockHtml = `
                <div style="display: flex; align-items: center; gap: 8px; min-width: 80px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--text-color);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: scaleX(-1); opacity: 0.85;">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                    </div>
                    <button onclick="quickDeleteWord(event, '${escapedWord}')" 
                            style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,59,48,0.3); background: rgba(255,59,48,0.1); color: #ff3b30; cursor: pointer; outline: none; transition: 0.2s; -webkit-tap-highlight-color: transparent;"
                            title="Удалить">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
        } else {
            // 🔥 Если 0% — бесцветный класс, если есть прогресс — рассчитываем цвет от красного к зеленому
            let badgeClass = percent === 0 ? 'dict-percent-badge is-zero' : 'dict-percent-badge has-color';
            let percentHue = 10 + (percent * 1.2); // оттенок от ~10 (красно-оранжевый) до ~130 (зеленый)

            rightBlockHtml = `
                <div style="display: flex; flex-direction: column; align-items: stretch; gap: 6px; min-width: 90px;">
                    <div class="${badgeClass}" style="--dynamic-hue: ${percentHue};">
                        ${percent}%
                    </div>
                    <button onclick="toggleWordSelection(event, '${escapedWord}', this)" 
                            class="btn-dict-train ${isSelected ? 'selected' : ''}"
                            style="--dynamic-hue: ${percentHue};"
                            title="Выбрать для тренировки">
                        ${btnText}
                    </button>
                </div>
            `;
        }

        html += `
            <div onclick="${clickAction}" class="dict-word-card ${isDictEditMode ? 'edit-mode' : ''}">
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; padding-right: 15px;">
                    <span style="font-size: 16px; font-weight: bold; color: var(--text-color); word-wrap: break-word;">${foreign}</span>
                    <span style="font-size: 13px; color: var(--hint-color); word-wrap: break-word; line-height: 1.3;">${ru}</span>
                    ${!isDictEditMode ? `
                    <div style="color: var(--hint-color); opacity: 0.4; margin-top: 4px; display: flex; align-items: center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>` : ''}
                </div>
                ${rightBlockHtml}
            </div>
        `;
    });

    html += '</div>';

    const pageDiv = document.createElement('div');
    pageDiv.innerHTML = html;
    listWrapper.appendChild(pageDiv);

    if (end < filteredDictionaryWords.length) {
        const btnDiv = document.createElement('div');
        btnDiv.id = 'load-more-dict-btn';
        btnDiv.style.marginTop = '15px';
        btnDiv.style.marginBottom = '30px';
        btnDiv.style.textAlign = 'center';
        btnDiv.innerHTML = `<button onclick="loadNextDictionaryPage()" style="padding: 12px 25px; background: var(--button-color); border: none; border-radius: 12px; color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">👇 Показать еще</button>`;
        listWrapper.appendChild(btnDiv);
    }
}

function loadNextDictionaryPage() {
    dictionaryCurrentPage++;
    renderDictionaryPage();
}

function toggleWordSelection(event, word, btnElement) {
    event.stopPropagation();

    // Теперь мы просто переключаем CSS-класс "selected" на кнопке
    if (selectedDictWords.has(word)) {
        selectedDictWords.delete(word);
        btnElement.classList.remove('selected');
    } else {
        selectedDictWords.add(word);
        btnElement.classList.add('selected');
    }

    updateDictSelectionPanel();
}

function updateDictSelectionPanel() {
    const panel = document.getElementById('dict-selection-panel');
    if (!panel) return;

    if (selectedDictWords.size > 0) {
        document.getElementById('dict-sel-count').innerText = selectedDictWords.size;
        panel.style.display = 'flex';
        setTimeout(() => {
            panel.style.opacity = '1';
            panel.style.pointerEvents = 'auto';
        }, 10);
    } else {
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        setTimeout(() => {
            if (selectedDictWords.size === 0) panel.style.display = 'none';
        }, 300);
    }
}

function clearDictSelection() {
    selectedDictWords.clear();
    updateDictSelectionPanel();

    // Снимаем класс "selected" со всех видимых кнопок
    const buttons = document.querySelectorAll('.btn-dict-train.selected');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
    });
}

function startSelectedTraining() {
    if (selectedDictWords.size === 0) return;

    let wordsToTrain = dictionaryWords.filter(w => {
        let foreign = w.word_foreign || w.foreign || w[0];
        return selectedDictWords.has(foreign);
    });

    let trainingWords = wordsToTrain.map(w => {
        return {
            // 🔥 Теперь фронтенд получает настоящий w.id из базы данных!
            id: w.id,
            foreign: w.word_foreign || w.foreign || w[0],
            ru: w.word_ru || w.ru || w[1],
            correctGuesses: 0
        };
    });

    window.currentAppMode = 'training';
    setAppHeader('🎯 Тренировка слов', true);

    document.getElementById('input-container').style.display = 'flex';
    document.getElementById('text-input-row').style.display = 'flex';

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.value = '';
        userInput.placeholder = "Перевод...";
        userInput.focus();
    }

    if (typeof trainingState !== 'undefined') {
        trainingState.activeRound = typeof shuffleArray === 'function' ? shuffleArray(trainingWords) : trainingWords;
        trainingState.nextRound = [];
        trainingState.currentIndex = 0;
        trainingState.totalWords = trainingWords.length;
        trainingState.completedWords = 0;

        const chatContainer = document.getElementById('chat-messages');
        chatContainer.innerHTML = '';
        showCurrentWord();
    }

    selectedDictWords.clear();
}

function openWordDetails(word) {
    const modal = document.getElementById('word-details-modal');
    const content = document.getElementById('wd-modal-content');

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 10);

    let currentLang = (window.userProfile && window.userProfile.language) || 'en';
    let safeWord = word.replace(/'/g, "\\'");

    document.getElementById('wd-title').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span>${word}</span>
            <div onclick="speakWord('${safeWord}', '${currentLang}')" 
                 style="font-size: 20px; cursor: pointer; padding: 6px; border-radius: 50%; background: rgba(112,132,153,0.1); display: flex; justify-content: center; align-items: center; transition: transform 0.1s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
                 onmousedown="this.style.transform='scale(0.9)'"
                 onmouseup="this.style.transform='scale(1)'"
                 title="Озвучить">
                 🔊
            </div>
        </div>
    `;

    const meaningsHeader = document.getElementById('wd-meanings').previousElementSibling;
    if (meaningsHeader) {
        meaningsHeader.style.display = 'flex';
        meaningsHeader.style.justifyContent = 'space-between';
        meaningsHeader.style.alignItems = 'center';

        const intensityIcon = typeof APP_ICONS !== 'undefined' && APP_ICONS.intensity ? APP_ICONS.intensity : '⚡';

        meaningsHeader.innerHTML = `
            <span>📚 Значения и примеры:</span>
            <button class="btn-glass-cream" 
                    style="width: auto; height: 32px; padding: 0 12px; font-size: 12px; border-radius: 10px; border: 1px solid rgba(243, 229, 171, 0.2); display: flex; align-items: center; gap: 6px; cursor: pointer; outline: none;"
                    onclick="closeWordDetails(); setTimeout(() => startIntensityFromDict(null, '${safeWord}'), 300);">
                <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;">
                    ${intensityIcon}
                </span>
                <span>В интенсив</span>
            </button>
        `;
    }

    document.getElementById('wd-transcription').innerText = '';
    document.getElementById('wd-loading').style.display = 'flex';
    document.getElementById('wd-data').style.display = 'none';
    document.getElementById('wd-meanings').innerHTML = '';

    apiFetch('/words/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, word: word })
    })
    .then(data => {
        if (data.success && data.details) {

            if (!data.success && window.isRateLimitError(data.error)) {
                return window.showLimitCard();
            }
            document.getElementById('wd-transcription').innerText = data.details.transcription || '';
            document.getElementById('wd-part').innerText = data.details.part_of_speech || '-';
            document.getElementById('wd-forms').innerText = data.details.forms || '-';

            const meaningsBox = document.getElementById('wd-meanings');
            currentWordMeanings = [];

            if (data.details.meanings && data.details.meanings.length > 0) {
                currentWordMeanings = data.details.meanings.slice(0, 5).map(m => m.meaning);

                // Создаем контейнер с отступом снизу, чтобы контент не перекрывался кнопкой
                let meaningsListHtml = '<div id="word-meanings-list" style="padding-bottom: 80px;">';

                data.details.meanings.forEach((m, index) => {
                    const safeMeaning = (m.meaning || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                    const safeExample = (m.example || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");

                    meaningsListHtml += `
                        <div class="dict-meaning-card">
                            
                            <!-- Зеленая галочка в правом верхнем углу -->
                            <button onclick="toggleMeaningCheckbox(this)" 
                                    data-selected="false"
                                    data-meaning="${safeMeaning}"
                                    style="position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.6); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; outline: none; font-size: 12px; -webkit-tap-highlight-color: transparent;">✓</button>

                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 5px; color: var(--text-color); padding-right: 35px;">${index + 1}. ${m.meaning}</div>
                            <div style="font-size: 14px; color: var(--hint-color); font-style: italic;">"${m.example || ''}"</div>
                        </div>
                    `;
                });

                meaningsListHtml += '</div>';

                // Плавающая зеленая кнопка без фоновой подложки, закрепленная внизу
                const safeForeignStr = word.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                    meaningsListHtml += `
                    <div id="dict-meaning-selection-panel" style="display: none; position: sticky; bottom: 10px; left: 0; right: 0; z-index: 100; opacity: 0; transition: opacity 0.3s; pointer-events: none; box-sizing: border-box; margin-top: 10px; display: flex; justify-content: center;">
                        <button id="save-selected-meanings-btn" onclick="saveSelectedMeanings('${safeForeignStr}')" 
                                class="btn-glass btn-glass-green" 
                                style="width: 70%; height: 46px; font-size: 13px; font-weight: 700; text-transform: uppercase; -webkit-tap-highlight-color: transparent; margin: 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
                            Сохранить значения
                        </button>
                    </div>
                `;

                meaningsBox.innerHTML = meaningsListHtml;
            }
        }
        document.getElementById('wd-loading').style.display = 'none';
        document.getElementById('wd-data').style.display = 'flex';
    });
}

function closeWordDetails() {
    const modal = document.getElementById('word-details-modal');
    const content = document.getElementById('wd-modal-content');
    modal.style.opacity = '0';
    content.style.transform = 'translateY(100%)';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function startIntensityFromDict(event, word) {
    if (event) event.stopPropagation();
    if (typeof showIntensitySetupMode === 'function') showIntensitySetupMode();
    if (typeof startIntensity === 'function') startIntensity(word, currentWordMeanings);
}

// ==========================================
// 🔥 ЛОГИКА РЕДАКТИРОВАНИЯ В СПИСКЕ СЛОВАРЯ
// ==========================================

// 🔥 Переключение режима редактирования (повторный клик успешно выходит из режима)
function toggleDictEditMode() {
    isDictEditMode = !isDictEditMode;
    const btn = document.getElementById('dict-edit-mode-btn');

    if (btn) {
        if (isDictEditMode) {
            btn.style.opacity = '0.3'; // Тусклая неактивная иконка в режиме правок
            selectedDictWords.clear();
            updateDictSelectionPanel();
        } else {
            btn.style.opacity = '1'; // Возвращаем яркость при выходе из режима
        }
    }

    renderDictionaryPage();
}

function ensureEditTooltipExists() {
    if (!document.getElementById('dict-edit-tooltip')) {
        const tooltipHtml = `
            <div id="dict-edit-tooltip" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 3000; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s; padding: 20px; box-sizing: border-box;">
                <div style="background: linear-gradient(135deg, rgba(20, 30, 45, 0.98) 0%, rgba(8, 12, 18, 1) 100%); width: 100%; max-width: 340px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 25px; box-sizing: border-box; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
                    <div style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--hint-color); font-weight: bold;">Редактировать перевод</div>
                    <div id="dict-edit-word" style="font-size: 24px; font-weight: bold; color: var(--button-color); margin-bottom: 20px; word-break: break-word;"></div>
                    
                    <textarea id="dict-edit-input" style="width: 100%; height: 120px; padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: var(--text-color); font-size: 15px; outline: none; box-sizing: border-box; resize: none; margin-bottom: 20px; font-family: 'Inter', sans-serif; line-height: 1.5;"></textarea>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="closeEditTranslationTooltip()" style="flex: 1; height: 46px; border-radius: 12px; font-size: 15px; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; outline: none;">Отмена</button>
                        <button id="dict-edit-save-btn" style="flex: 1; height: 46px; border-radius: 12px; font-size: 15px; font-weight: bold; border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.15); color: #a7f3d0; cursor: pointer; outline: none;">Сохранить</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', tooltipHtml);
    }
}

function openEditTranslationTooltip(word) {
    const modal = document.getElementById('dict-edit-tooltip');
    const wordTitle = document.getElementById('dict-edit-word');
    const input = document.getElementById('dict-edit-input');
    const saveBtn = document.getElementById('dict-edit-save-btn');

    let wordObj = dictionaryWords.find(w => (w.word_foreign || w.foreign || w[0]) === word);
    let currentRu = wordObj ? (wordObj.word_ru || wordObj.ru || wordObj[1]) : '';

    wordTitle.innerText = word;
    input.value = currentRu;
    saveBtn.onclick = () => saveEditTranslation(word);

    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
    setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }, 100);
}

function closeEditTranslationTooltip() {
    const modal = document.getElementById('dict-edit-tooltip');
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 200);
}

function saveEditTranslation(word) {
    const input = document.getElementById('dict-edit-input');
    const newTranslation = input.value.trim();

    if (!newTranslation) {
        alert("Перевод не может быть пустым!");
        return;
    }

    input.disabled = true;
    document.getElementById('dict-edit-save-btn').disabled = true;

    apiFetch('/words/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, word: word, new_translation: newTranslation })
    }).then(data => {
        input.disabled = false;
        document.getElementById('dict-edit-save-btn').disabled = false;

        if (data.success) {
            let wordObj = dictionaryWords.find(w => (w.word_foreign || w.foreign || w[0]) === word);
            if (wordObj) {
                if (wordObj.word_ru !== undefined) wordObj.word_ru = newTranslation;
                else if (wordObj.ru !== undefined) wordObj.ru = newTranslation;
                else if (wordObj[1] !== undefined) wordObj[1] = newTranslation;
            }

            closeEditTranslationTooltip();

            if (isDictEditMode) {
                toggleDictEditMode();
            } else {
                renderDictionaryPage();
            }
        } else {
            alert('❌ Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'));
        }
    }).catch(err => {
        input.disabled = false;
        document.getElementById('dict-edit-save-btn').disabled = false;
        alert('⚠️ Ошибка сети при сохранении перевода.');
    });
}

// 🔥 Быстрое удаление слова прямо из списка
function quickDeleteWord(event, word) {
    // ВАЖНО: Останавливаем клик, чтобы он не "провалился" ниже и не открыл окно редактирования текста
    event.stopPropagation();

    if (!confirm(`Удалить слово "${word}" из словаря?`)) {
        return;
    }

    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.style.pointerEvents = 'none';

    apiFetch('/words/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, word: word })
    }).then(data => {
        if (data.success) {
            // Удаляем слово из локальных массивов
            dictionaryWords = dictionaryWords.filter(w => (w.word_foreign || w.foreign || w[0]) !== word);

            const query = document.getElementById('dict-search') ? document.getElementById('dict-search').value : '';
            if (query) {
                // Если был активен поиск, обновляем результаты поиска
                filterDictionary(query);
            } else {
                // Если поиска не было, просто обновляем общий список
                filteredDictionaryWords = [...dictionaryWords];

                const countSpan = document.getElementById('dict-count');
                if (countSpan) countSpan.innerText = dictionaryWords.length;

                renderDictionaryPage();
            }
        } else {
            alert('❌ Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
        }
    }).catch(err => {
        alert('⚠️ Ошибка сети при удалении слова.');
        btn.innerHTML = originalHtml;
        btn.style.pointerEvents = 'auto';
    });
}

// Переключение состояния галочки у конкретного значения слова
// Переключение состояния галочки у конкретного значения слова
// Переключение состояния галочки у конкретного значения слова
function toggleMeaningCheckbox(btn) {
    const isSelected = btn.getAttribute('data-selected') === 'true';

    if (!isSelected) {
        btn.setAttribute('data-selected', 'true');
        btn.style.background = 'rgba(16, 185, 129, 0.35)';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.8)';
        btn.style.color = '#34d399';
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    } else {
        btn.setAttribute('data-selected', 'false');
        btn.style.background = 'rgba(255, 255, 255, 0.08)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btn.style.color = 'rgba(255, 255, 255, 0.6)';
    }

    // Управляем плавающей панелью снизу
    const list = document.getElementById('word-meanings-list');
    const panel = document.getElementById('dict-meaning-selection-panel');

    if (list && panel) {
        const hasSelected = list.querySelector('button[data-selected="true"]') !== null;
        if (hasSelected) {
            panel.style.display = 'flex';
            setTimeout(() => {
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
            }, 10);
        } else {
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';
            setTimeout(() => {
                const stillSelected = list.querySelector('button[data-selected="true"]') !== null;
                if (!stillSelected) panel.style.display = 'none';
            }, 300);
        }
    }
}

// Отправка выбранных значений на сервер с превращением кнопки в плашку успеха и возвратом в читалку
// Отправка выбранных дополнительных значений с дописыванием к уже имеющимся
// Отправка выбранных дополнительных значений с дописыванием к уже имеющимся
// Отправка выбранных дополнительных значений с дописыванием к уже имеющимся
// Отправка выбранных дополнительных значений с дописыванием к уже имеющимся
function saveSelectedMeanings(foreignWord) {
    const list = document.getElementById('word-meanings-list');
    const saveBtn = document.getElementById('save-selected-meanings-btn');
    if (!list || !saveBtn) return;

    const selectedBtns = list.querySelectorAll('button[data-selected="true"]');
    if (selectedBtns.length === 0) return;

    // Жесткая очистка слова от возможных HTML-тегов или лишних символов
    let cleanForeignWord = String(foreignWord).replace(/<[^>]*>/g, '').trim();

    const chosenMeanings = [];
    selectedBtns.forEach(btn => {
        const meaning = btn.getAttribute('data-meaning');
        if (meaning) chosenMeanings.push(meaning.trim());
    });

    if (chosenMeanings.length === 0) return;

    // Ищем существующий перевод в локальном массиве словаря
    let existingRu = "";
    if (typeof dictionaryWords !== 'undefined' && Array.isArray(dictionaryWords)) {
        let found = dictionaryWords.find(w => {
            let fWord = w.word_foreign || w.foreign || w[0] || "";
            return String(fWord).toLowerCase().trim() === cleanForeignWord.toLowerCase();
        });
        if (found) {
            existingRu = found.word_ru || found.ru || found[1] || "";
        }
    }

    // Объединяем старый перевод и новые значения без дубликатов
    let existingArray = existingRu.split(',').map(s => s.trim()).filter(Boolean);
    chosenMeanings.forEach(m => {
        if (!existingArray.includes(m)) {
            existingArray.push(m);
        }
    });
    const combinedTranslation = existingArray.join(', ');

    // Фиксируем размеры кнопки на момент сохранения
    saveBtn.style.width = `${saveBtn.offsetWidth}px`;
    saveBtn.style.height = `${saveBtn.offsetHeight}px`;
    saveBtn.innerHTML = '⏳ Сохраняю...';
    saveBtn.style.pointerEvents = 'none';

    // 🔥 ИСПРАВЛЕНИЕ: Отправляем на /words/edit вместо /words/add для обновления слова
    apiFetch('/words/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            word: cleanForeignWord,               // Ключ для /words/edit
            new_translation: combinedTranslation  // Ключ для /words/edit
        })
    }).then(data => {
        if (data && data.success) {
            saveBtn.innerHTML = '✅ Успешно сохранено!';
            saveBtn.style.background = 'rgba(16, 185, 129, 0.25)';
            saveBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            saveBtn.style.color = '#a7f3d0';

            // Синхронизируем локальный массив с новыми данными
            let wordObj = dictionaryWords.find(w => (w.word_foreign || w.foreign || w[0]) === cleanForeignWord);
            if (wordObj) {
                if (wordObj.word_ru !== undefined) wordObj.word_ru = combinedTranslation;
                else if (wordObj.ru !== undefined) wordObj.ru = combinedTranslation;
                else if (wordObj[1] !== undefined) wordObj[1] = combinedTranslation;
            }

            selectedBtns.forEach(btn => {
                btn.onclick = null;
                btn.style.pointerEvents = 'none';
            });

            // Закрываем модальное окно и обновляем словарь
            setTimeout(() => {
                if (typeof closeWordDetails === 'function') {
                    closeWordDetails();
                }
                if (typeof showFullDictionary === 'function' && window.currentAppMode === 'dictionary') {
                    showFullDictionary();
                }
            }, 1200);

        } else {
            saveBtn.innerHTML = '❌ Ошибка';
            saveBtn.style.pointerEvents = 'auto';
            console.error("Ошибка сохранения слова:", data ? data.error : "пустой ответ");
        }
    }).catch(err => {
        saveBtn.innerHTML = '⚠️ Ошибка сети';
        saveBtn.style.pointerEvents = 'auto';
        console.error("Ошибка сети:", err);
    });
}