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

// 🎨 Отрисовка карточки для ОДНОГО слова
// 🎨 Отрисовка карточки для ОДНОГО слова
function renderSingleWordResult(originalWord, details) {
    const chatContainer = document.getElementById('chat-messages');

    let displayTitle = details.word || originalWord;

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

    const safeForeignStr = displayTitle.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const safeRuStr = saveRu.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const currentLang = (window.userProfile && window.userProfile.language) || 'en';

    // 🔥 Если ИИ исправил опечатку, покажем красивую желтую плашку над заголовком!
    let typoBanner = '';
    if (details.is_typo) {
        typoBanner = `
            <div style="background: rgba(255, 159, 10, 0.15); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px; color: #ff9f0a; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">💡</span>
                <span>Возможно, была опечатка. Показан перевод для слова <b>${displayTitle}</b>.</span>
            </div>
        `;
    }

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px;">
            <div style="background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; width: 100%;">
                
                ${typoBanner}

                <div style="text-align: left; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--button-color); word-break: break-word;">${displayTitle}</div>
                        <div onclick="speakWord('${safeForeignStr}', '${currentLang}')" 
                             style="font-size: 20px; cursor: pointer; padding: 6px; border-radius: 50%; background: rgba(112,132,153,0.1); display: flex; justify-content: center; align-items: center; transition: transform 0.1s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
                             onmousedown="this.style.transform='scale(0.9)'"
                             onmouseup="this.style.transform='scale(1)'"
                             title="Озвучить">
                             🔊
                        </div>
                    </div>
                    <div style="font-size: 14px; color: rgba(255,255,255,0.6);">${details.transcription || ''} ${details.part_of_speech ? '• ' + details.part_of_speech : ''}</div>
                </div>
                
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; text-align: left;">Значения и примеры:</div>
                ${meaningsHtml}

                <button id="single-word-save-btn" onclick="toggleSingleWordSave(this, '${safeForeignStr}', '${safeRuStr}')" 
                        data-added="false" 
                        class="btn-glass btn-glass-cream" 
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
                // 🔥 ФОРСИРОВАННОЕ ОБНОВЛЕНИЕ СЧЕТЧИКА НА ЭКРАНЕ
                const mpWords = document.getElementById('mp-words');
                if (mpWords) {
                    const currentCount = parseInt(mpWords.innerText) || 0;
                    mpWords.innerText = currentCount + 1;
                }
            } else {
                btn.innerHTML = '⚠️ Уже в словаре';
                btn.style.background = 'rgba(255, 159, 10, 0.25)';
                btn.style.borderColor = 'rgba(255, 159, 10, 0.5)';
                btn.style.color = '#ff9f0a';
            }

            // 🔥 ВЫВОД СЕМАНТИКИ В КОНСОЛЬ ДЛЯ ДЕБАГА
            if (data.semantic_tags && data.semantic_tags.length > 0) {
                const logObj = {
                    [data.word_id]: data.semantic_tags
                };

                console.log(`%c[SEMANTIC GRAPH] Разметка нового слова:`, 'color: #8b5cf6; font-weight: bold;');
                console.log(`%cID ${data.word_id}: "${word}" (Translation: ${translation})`, 'color: #34d399; font-weight: bold;');
                console.log(JSON.stringify(logObj, null, 2));
                console.log(`%c✅ Успешно вшито в семантическую базу!`, 'color: #34c759;');
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
    const currentLang = (window.userProfile && window.userProfile.language) || 'en';

    if (newWords && newWords.length > 0) {
        wordsHtml = `
            <div style="margin-top: 20px; text-align: left; padding-bottom: 80px;">
                <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">Незнакомые слова из текста:</div>
                <div id="smart-translator-words-list" style="display: flex; flex-direction: column; gap: 8px;">
        `;

        newWords.forEach((wordObj) => {
            const safeWord = wordObj.word.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            const safeTranslation = wordObj.translation.replace(/'/g, "\\'").replace(/"/g, "&quot;");

            wordsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 12px 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05);">
                    <div>
                        <!-- 🔥 ЗДЕСЬ ДОБАВЛЕН ДИНАМИК ОЗВУЧКИ ДЛЯ КАЖДОГО СЛОВА В СПИСКЕ -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                            <div style="font-weight: 600; color: var(--text-color); font-size: 15px;">${wordObj.word}</div>
                            <div onclick="speakWord('${safeWord}', '${currentLang}')" 
                                 style="font-size: 14px; cursor: pointer; padding: 4px; border-radius: 50%; background: rgba(255,255,255,0.08); display: flex; justify-content: center; align-items: center; transition: transform 0.1s;"
                                 onmousedown="this.style.transform='scale(0.9)'"
                                 onmouseup="this.style.transform='scale(1)'"
                                 title="Озвучить">
                                 🔊
                            </div>
                        </div>
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
            </div>
            <!-- 🔥 ПЛАВАЮЩАЯ ЗЕЛЕНАЯ КНОПКА СОХРАНЕНИЯ -->
            <button id="save-selected-words-btn" onclick="saveSelectedWords()" class="btn-glass btn-glass-green" style="position: fixed; bottom: 30px; left: 5%; width: 90%; height: 52px; display: none; z-index: 1000; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3); font-size: 16px; -webkit-tap-highlight-color: transparent;">Сохранить выбранные</button>
        `;
    } else {
        wordsHtml = `
            <div style="margin-top: 20px; text-align: center; padding: 15px; background: rgba(168, 129, 243, 0.08); border-radius: 14px; border: 1px solid rgba(168, 129, 243, 0.2);">
                <div style="font-size: 13px; color: #dfcbf7; font-weight: 500;">В этом тексте нет новых для вас слов! 🎉</div>
            </div>
        `;
    }

    chatContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; margin-top: 15px; position: relative;">
            <div style="background: linear-gradient(135deg, rgba(20, 30, 45, 0.95) 0%, rgba(8, 12, 18, 0.98) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 20px; box-sizing: border-box; width: 100%; position: relative;">
                
                <button onclick="exitToMainMenu()" class="btn-glass btn-glass-neutral" style="position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; padding: 0; border-radius: 50%; display: flex; justify-content: center; align-items: center; z-index: 10; -webkit-tap-highlight-color: transparent;">
                    <span style="font-size: 14px; opacity: 0.8;">✕</span>
                </button>

                <div style="text-align: left; padding-right: 30px;">
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

            const mpWords = document.getElementById('mp-words');
            if (mpWords && data.added_count) {
                const currentCount = parseInt(mpWords.innerText) || 0;
                mpWords.innerText = currentCount + data.added_count;
            }

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

            // 🔥 Вывод семантики для списка слов
            if (data.semantic_logs && Object.keys(data.semantic_logs).length > 0) {
                console.log(`%c[SEMANTIC GRAPH] Массовая разметка ${data.added_count} слов:`, 'color: #8b5cf6; font-weight: bold;');

                for (const [id, info] of Object.entries(data.semantic_logs)) {
                    const logObj = { [id]: info.tags };
                    console.log(`%cID ${id}: "${info.word}"`, 'color: #34d399; font-weight: bold;');
                    console.log(JSON.stringify(logObj, null, 2));
                }
                console.log(`%c✅ Все слова успешно вшиты в семантическую базу!`, 'color: #34c759;');
            }

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

