// ==========================================
// 🔥 ФАЙЛ: frontend/js/translator.js
// Смарт-переводчик (Слово или Текст)
// ==========================================
// Функция для динамической смены иконки (Камера <-> Стрелка)
function toggleTranslatorIcon(inputElement) {
    const cameraIcon = document.getElementById('icon-camera');
    const arrowIcon = document.getElementById('icon-arrow');

    if (inputElement.value.trim() === '') {
        cameraIcon.style.display = 'block';
        arrowIcon.style.display = 'none';
    } else {
        cameraIcon.style.display = 'none';
        arrowIcon.style.display = 'block';
    }
}


function startQuickTranslation() {
    const input = document.getElementById('quick-translator-input');
    const text = input ? input.value.trim() : '';

    // 🔥 НОВАЯ ЛОГИКА: Если поле пустое, запускаем сканирование фото
    if (!text) {
        if (typeof triggerImageUpload === 'function') {
            triggerImageUpload();
        }
        return;
    }

    // Очищаем поле и сбрасываем иконку обратно на камеру
    input.value = '';
    toggleTranslatorIcon(input);

    window.currentAppMode = 'text_translation';
    setAppHeader('Перевод', true);

    // Скрываем лишние элементы меню
    if (document.getElementById('mini-profile')) document.getElementById('mini-profile').style.display = 'none';
    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.style.display = 'flex';

    // Проверяем, сколько слов ввел пользователь
    const isSingleWord = text.split(/\s+/).length === 1;

    if (isSingleWord) {
        // 💡 ЛОГИКА ДЛЯ ОДНОГО СЛОВА (Детальная карточка)
        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
                    <div style="font-size: 15px; color: var(--hint-color);">Ищу значения слова...</div>
                </div>
            </div>
        `;

        apiFetch('/words/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.id, foreign: text })
        }).then(data => {
            if (window.currentAppMode !== 'text_translation') return;

            if (!data.success && window.isRateLimitError(data.error)) {
                return window.showLimitCard();
            }
            // 🔥 Бэкенд теперь будет отдавать data.details прямо из /words/translate
            if (data.success && data.details) {
                renderSingleWordResult(text, data.details);
            } else {
// 🔥 Теперь мы увидим реальную причину прямо на экране!
                const errMsg = data.error ? data.error : "Сервер не вернул details";
                chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff3b30; font-weight: bold;">❌ Ошибка: ${errMsg}</div>`;
            }
        }).catch(err => {
            chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff3b30; font-weight: bold;">⚠️ Ошибка сети.</div>`;
        });

    } else {
        // 📝 ЛОГИКА ДЛЯ ТЕКСТА (Массовое добавление)
        chatContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 25px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
                    <div style="font-size: 15px; color: var(--hint-color);">Перевожу текст и ищу новые слова...</div>
                </div>
            </div>
        `;

        apiFetch('/translate/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: user.id, text: text })
        }).then(data => {
            if (window.currentAppMode !== 'text_translation') return;

            // 🔥 ПРОВЕРКА ЛИМИТА
            if (!data.success && window.isRateLimitError(data.error)) {
                return window.showLimitCard();
            }

            if (data.success) {
                renderTranslationResult(text, data.translation, data.new_words);
            } else {
                chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff3b30; font-weight: bold;">❌ Ошибка: ${data.error}</div>`;
            }
        }).catch(err => {
            chatContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff3b30; font-weight: bold;">⚠️ Ошибка связи с сервером.</div>`;
        });
    }
}

// 🎨 Отрисовка карточки для ОДНОГО слова (максимум 3 значения + фиолетовая кнопка внизу)
// 🎨 Отрисовка карточки для ОДНОГО слова (максимум 3 значения + фиолетовая кнопка внизу)
// 🎨 Отрисовка карточки для ОДНОГО слова
// 🎨 Отрисовка карточки для ОДНОГО слова
function renderSingleWordResult(originalWord, details) {
    const chatContainer = document.getElementById('chat-messages');

    // 🔥 Бэкенд теперь ВСЕГДА кладет иностранное слово в details.word
    let displayTitle = details.word || originalWord;

    // 🔥 Бэкенд ВСЕГДА кладет русские переводы в details.meanings. Берем до 3 штук!
    let saveRu = originalWord;
    if (details.meanings && details.meanings.length > 0) {
        saveRu = details.meanings.slice(0, 3).map(m => m.meaning).join(', ');
    }

    let meaningsHtml = '';
    if (details.meanings && details.meanings.length > 0) {
        details.meanings.slice(0, 3).forEach((m, index) => {
            meaningsHtml += `
                <div style="background: rgba(0,0,0,0.2); padding: 12px 15px; border-radius: 12px; border-left: 3px solid var(--button-color); margin-bottom: 8px; text-align: left;">
                    <div style="font-weight: 600; font-size: 15px; color: var(--text-color); margin-bottom: 4px;">${index + 1}. ${m.meaning}</div>
                    <div style="font-size: 13px; color: var(--hint-color); font-style: italic;">"${m.example || ''}"</div>
                </div>
            `;
        });
    }

    // Защита от кавычек для передачи в функцию сохранения
    const safeForeignStr = displayTitle.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const safeRuStr = saveRu.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; width: 100%;">
                
                <div style="text-align: left; margin-bottom: 15px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--button-color); margin-bottom: 4px; word-break: break-word;">${displayTitle}</div>
                    <div style="font-size: 14px; color: rgba(255,255,255,0.6);">${details.transcription || ''} ${details.part_of_speech ? '• ' + details.part_of_speech : ''}</div>
                </div>
                
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; text-align: left;">Значения и примеры:</div>
                ${meaningsHtml}

                <button id="single-word-save-btn" onclick="toggleSingleWordSave(this, '${safeForeignStr}', '${safeRuStr}')" 
                        data-added="false" 
                        class="btn-glass btn-glass-purple" 
                        style="margin-top: 15px; width: 100%; height: 46px; -webkit-tap-highlight-color: transparent;">Добавить в словарь</button>
            </div>
        </div>
    `;
}

// ➕/✅ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
// ➕ Переключение состояния кнопки сохранения для одного слова
function toggleSingleWordSave(btn, word, translation) {
    // Сохраняем исходные размеры и текст кнопки, чтобы плашка встала ровно на её место
    const originalWidth = btn.offsetWidth;
    const originalHeight = btn.offsetHeight;

    btn.style.width = `${originalWidth}px`;
    btn.style.height = `${originalHeight}px`;
    btn.innerHTML = '⏳';
    btn.style.pointerEvents = 'none';

    apiFetch('/words/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, foreign: word, ru: translation })
    }).then(data => {
        if (data.success) {

            // 🔥 ПРЕВРАЩАЕМ САМУ КНОПКУ В АККУРАТНУЮ ПЛАШКУ НА ЕЁ МЕСТЕ
            if (data.added) {
                btn.innerHTML = '✅ Успешно';
                btn.style.background = 'rgba(16, 185, 129, 0.25)';
                btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                btn.style.color = '#a7f3d0';
            } else {
                btn.innerHTML = '⚠️ Уже в словаре';
                btn.style.background = 'rgba(255, 159, 10, 0.25)';
                btn.style.borderColor = 'rgba(255, 159, 10, 0.5)';
                btn.style.color = '#ff9f0a';
            }

            // Ждем 1.2 секунды и возвращаемся в читалку (если пришли оттуда)
            setTimeout(() => {
                if (window.returnToReader) {
                    window.returnToReader = false;

                    const translatorInput = document.getElementById('quick-translator-input');
                    if (translatorInput) translatorInput.value = "";

                    if (typeof loadBookLocally === 'function') {
                        loadBookLocally();
                    }
                } else {
                    if (typeof exitToMainMenu === 'function') {
                        exitToMainMenu();
                    }
                }
            }, 1200);

        } else {
            btn.innerHTML = '❌ Ошибка';
            btn.style.pointerEvents = 'auto';
        }
    }).catch(() => {
        btn.innerHTML = '⚠️ Ошибка сети';
        btn.style.pointerEvents = 'auto';
    });
}



// 🎨 Отрисовка результатов для ТЕКСТА
function renderTranslationResult(original, translation, newWords) {
    const chatContainer = document.getElementById('chat-messages');
    let wordsHtml = '';

    if (newWords && newWords.length > 0) {
        wordsHtml = `
            <div style="margin-top: 20px; text-align: left;">
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">Незнакомые слова из текста:</div>
                <div id="smart-translator-words-list" style="display: flex; flex-direction: column; gap: 8px;">
        `;

        newWords.forEach((wordObj) => {
            const safeWord = wordObj.word.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            const safeTranslation = wordObj.translation.replace(/'/g, "\\'").replace(/"/g, "&quot;");

            wordsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 12px 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05);">
                    <div>
                        <div style="font-weight: 600; color: var(--text-color); font-size: 15px; margin-bottom: 3px;">${wordObj.word}</div>
                        <div style="font-size: 13px; color: rgba(255,255,255,0.6);">${wordObj.translation}</div>
                    </div>
                    <button onclick="toggleLocalWordState(this)" 
                            data-selected="false"
                            data-word="${safeWord}"
                            data-translation="${safeTranslation}"
                            style="width: 36px; height: 36px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.6); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; outline: none; font-size: 14px; -webkit-tap-highlight-color: transparent;">➕</button>
                </div>
            `;
        });

        wordsHtml += `
                </div>
                <button id="save-selected-words-btn" onclick="saveSelectedWords()" class="btn-glass btn-glass-purple" style="margin-top: 15px; width: 100%; height: 46px; display: none; -webkit-tap-highlight-color: transparent;">Сохранить выбранные</button>
            </div>`;
    } else {
        wordsHtml = `
            <div style="margin-top: 20px; text-align: center; padding: 15px; background: rgba(168, 129, 243, 0.08); border-radius: 14px; border: 1px solid rgba(168, 129, 243, 0.2);">
                <div style="font-size: 13px; color: #dfcbf7; font-weight: 500;">В этом тексте нет новых для вас слов! 🎉</div>
            </div>
        `;
    }

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; width: 100%;">
                
                <div style="text-align: left;">
                    <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Оригинал:</div>
                    <div style="font-size: 15px; color: rgba(255,255,255,0.7); margin-bottom: 16px; word-wrap: break-word; line-height: 1.4;">${original}</div>
                    
                    <div style="font-size: 11px; color: #dfcbf7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: bold;">Перевод:</div>
                    <div style="font-size: 17px; color: var(--text-color); word-wrap: break-word; line-height: 1.4; font-weight: 500;">${translation}</div>
                </div>
                
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 20px 0;">
                
                ${wordsHtml}
            </div>
        </div>
    `;
}

// Переключение состояния кнопки (крестика) для каждого слова в списке
function toggleLocalWordState(btn) {
    const isSelected = btn.getAttribute('data-selected') === 'true';

    if (!isSelected) {
        btn.setAttribute('data-selected', 'true');
        // 🔥 УВЕЛИЧИЛИ НАСЫЩЕННОСТЬ И ЯРКОСТЬ ЗЕЛЕНОГО
        btn.style.background = 'rgba(16, 185, 129, 0.35)';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.8)';
        btn.style.color = '#34d399'; // Ярко-зеленый оттенок текста/иконки

        btn.style.transform = 'scale(1.1)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    } else {
        btn.setAttribute('data-selected', 'false');
        // Возвращаем стандартный серый цвет
        btn.style.background = 'rgba(255, 255, 255, 0.08)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btn.style.color = 'rgba(255, 255, 255, 0.6)';
    }

    const list = document.getElementById('smart-translator-words-list');
    const saveBtn = document.getElementById('save-selected-words-btn');
    if (list && saveBtn) {
        const hasSelected = list.querySelector('button[data-selected="true"]') !== null;
        saveBtn.style.display = hasSelected ? 'flex' : 'none';
    }
}

// 💾 Сохранение выбранных слов (если выделили целый абзац текста)
// 💾 Сохранение выбранных слов (если выделили целый абзац текста)
function saveSelectedWords() {
    const list = document.getElementById('smart-translator-words-list');
    const saveBtn = document.getElementById('save-selected-words-btn');
    if (!list || !saveBtn) return;

    const selectedBtns = list.querySelectorAll('button[data-selected="true"]');
    if (selectedBtns.length === 0) return;

    const wordsToSave = [];
    selectedBtns.forEach(btn => {
        wordsToSave.push({
            foreign: btn.getAttribute('data-word'),
            ru: btn.getAttribute('data-translation')
        });
    });

    // Фиксируем ширину/высоту кнопки, чтобы плашка не прыгала
    const originalWidth = saveBtn.offsetWidth;
    const originalHeight = saveBtn.offsetHeight;
    if (originalWidth) saveBtn.style.width = `${originalWidth}px`;
    if (originalHeight) saveBtn.style.height = `${originalHeight}px`;

    saveBtn.innerHTML = '⏳ Сохраняю...';
    saveBtn.style.pointerEvents = 'none';

    apiFetch('/words/add_multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: user.id,
            words: wordsToSave
        })
    }).then(data => {
        if (data.success) {
            // 🔥 ПРЕВРАЩАЕМ КНОПКУ В ЗЕЛЕНУЮ ПЛАШКУ (Центрального уведомления больше нет)
            saveBtn.innerHTML = '✅ Успешно сохранено!';
            saveBtn.style.background = 'rgba(16, 185, 129, 0.25)';
            saveBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            saveBtn.style.color = '#a7f3d0';

            selectedBtns.forEach(btn => {
                btn.onclick = null;
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.6';
            });

            const unselectedBtns = list.querySelectorAll('button[data-selected="false"]');
            unselectedBtns.forEach(btn => {
                btn.parentElement.style.opacity = '0.3';
                btn.onclick = null;
            });

            // 🔥 ЛОГИКА ВОЗВРАТА (Ждем 1.2 секунды и возвращаемся в читалку или меню)
            setTimeout(() => {
                if (window.returnToReader) {
                    window.returnToReader = false;
                    const translatorInput = document.getElementById('quick-translator-input');
                    if (translatorInput) translatorInput.value = "";

                    if (typeof loadBookLocally === 'function') {
                        loadBookLocally();
                    }
                } else {
                    if (typeof exitToMainMenu === 'function') {
                        exitToMainMenu();
                    }
                }
            }, 1200);

        } else {
            saveBtn.innerHTML = '❌ Ошибка';
            saveBtn.style.pointerEvents = 'auto';
        }
    }).catch(err => {
        saveBtn.innerHTML = '⚠️ Ошибка сети';
        saveBtn.style.pointerEvents = 'auto';
    });
}

function showToast(message) {
    let toast = document.getElementById('custom-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        // Окно теперь по центру (top: 50%) и немного увеличено для читаемости
        toast.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); background: rgba(20, 30, 45, 0.98); color: #fff; padding: 18px 30px; border-radius: 16px; font-size: 16px; font-weight: bold; z-index: 10000; box-shadow: 0 15px 40px rgba(0,0,0,0.7); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); transition: opacity 0.25s ease, transform 0.25s ease; opacity: 0; pointer-events: none; border: 1px solid rgba(255,255,255,0.15); text-align: center;';
        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.style.display = 'block';

    // Плавное появление (выезжает из глубины за счет scale)
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Плавное исчезновение синхронно с переходом в главное меню (через 1.2 сек)
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => { toast.style.display = 'none'; }, 250);
    }, 1200);
}

