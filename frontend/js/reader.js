// ==========================================
// ФАЙЛ: frontend/js/reader.js
// СКРОЛЛ + ПРОГРЕСС-БАР + НАСТРОЙКИ (ПОЛЗУНОК ОТТЕНКА ТОЛЬКО ДЛЯ НОЧИ)
// ==========================================

let currentBookChunks = [];
let currentBookTitle = "Чтение";

// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ЛОКАЛЬНАЯ БАЗА (IndexedDB)
// ==========================================

function initLocalDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("AIMentorReaderDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("books")) {
                db.createObjectStore("books");
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function checkBookExists(fileId) {
    return new Promise(async (resolve) => {
        try {
            const db = await initLocalDB();
            const tx = db.transaction("books", "readonly");
            const store = tx.objectStore("books");
            const request = store.get(fileId);
            request.onsuccess = () => resolve(request.result !== undefined);
            request.onerror = () => resolve(false);
        } catch (e) {
            resolve(false);
        }
    });
}

async function saveBookLocally(fileId, title, chunks) {
    try {
        const db = await initLocalDB();
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        store.put({ title: title, chunks: chunks, id: fileId }, fileId);

        localStorage.setItem("reader_last_book_id", fileId);
    } catch (err) {
        console.error("Ошибка сохранения книги:", err);
    }
}

async function loadBookLocally(fileId = null) {
    try {
        const targetId = fileId || localStorage.getItem("reader_last_book_id") || "current_book";

        const db = await initLocalDB();
        const tx = db.transaction("books", "readonly");
        const store = tx.objectStore("books");
        const request = store.get(targetId);

        request.onsuccess = () => {
            const data = request.result;
            if (data && data.chunks && data.chunks.length > 0) {
                currentBookChunks = data.chunks;
                currentBookTitle = data.title || "Чтение";

                localStorage.setItem("reader_last_book_id", targetId);

                openReaderInterface();
                renderBookChunk();
            } else {
                document.getElementById('book-upload-input').click();
            }
        };
    } catch (err) {
        console.error("Ошибка загрузки книги:", err);
    }
}

// ==========================================
// 2. КЛИК ПО КАРТОЧКЕ И КРАСИВЫЙ ПОПАП
// ==========================================
function handleTextCardClick() {
    const lastBookId = localStorage.getItem("reader_last_book_id") || "current_book";

    initLocalDB().then(db => {
        const tx = db.transaction("books", "readonly");
        const store = tx.objectStore("books");
        const request = store.get(lastBookId);

        request.onsuccess = () => {
            if (request.result && request.result.chunks) {
                const modal = document.getElementById('reader-choice-modal');
                const titleEl = document.getElementById('rc-modal-title');

                if (modal && titleEl) {
                    titleEl.innerText = request.result.title || "Сохраненная книга";
                    modal.style.display = 'flex';
                    setTimeout(() => modal.style.opacity = '1', 10);
                } else {
                    loadBookLocally(lastBookId);
                }
            } else {
                document.getElementById('book-upload-input').click();
            }
        };
    }).catch(() => {
        document.getElementById('book-upload-input').click();
    });
}

function closeReaderChoiceModal() {
    const modal = document.getElementById('reader-choice-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function continueBookFromModal() {
    closeReaderChoiceModal();
    loadBookLocally();
}

function startNewBookFromModal() {
    closeReaderChoiceModal();
    document.getElementById('book-upload-input').click();
}

// ==========================================
// 3. ИНТЕРФЕЙС ЧИТАЛКИ И ШАПКА
// ==========================================

function updateReaderHeader(title) {
    if (typeof setAppHeader === 'function') setAppHeader(title, true);

    const titleEl = document.getElementById('top-bar-title');
    if (titleEl) {
        titleEl.style.maxWidth = '60%';
        titleEl.style.whiteSpace = 'nowrap';
        titleEl.style.overflow = 'hidden';
        titleEl.style.textOverflow = 'ellipsis';
    }

    const actionsEl = document.getElementById('top-bar-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `
            <button onclick="openReaderSettingsModal()" style="background: transparent; border: none; color: rgba(255,255,255,0.8); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 10px; outline: none; -webkit-tap-highlight-color: transparent;">
                ${typeof APP_ICONS !== 'undefined' && APP_ICONS.settings ? APP_ICONS.settings : '⚙️'}
            </button>
        `;
    }
}

function openReaderInterface() {
    console.log("🔧 [Читалка] Открываем интерфейс...");
    window.currentAppMode = 'text_reader';

    updateReaderHeader(currentBookTitle);

    const hideList = ['main-menu-cards', 'quick-translator-block', 'live-chat-block', 'chat-messages', 'input-container', 'mini-profile'];
    hideList.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const outputArea = document.getElementById('output-area');
    if (outputArea) {
        outputArea.style.padding = '0';
    }

    const readerContainer = document.getElementById('reader-container');
    if (readerContainer) {
        readerContainer.style.display = 'flex';
        readerContainer.style.flexDirection = 'column';
        readerContainer.style.width = '100%';
        readerContainer.style.height = '100%';
        readerContainer.style.minHeight = '85vh';
        readerContainer.style.background = 'rgba(20, 20, 25, 0.6)';
        readerContainer.style.borderRadius = '0';
        readerContainer.style.padding = '0';
        readerContainer.style.marginTop = '0';

        if (typeof applySavedTheme === 'function') applySavedTheme();
    }

    const nextBtn = document.getElementById('next-page-btn');
    const prevBtn = document.getElementById('prev-page-btn');
    if (nextBtn) nextBtn.style.display = 'none';
    if (prevBtn) prevBtn.style.display = 'none';
}

// 4. Отправка на сервер ИЛИ загрузка из кэша
async function handleBookUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileId = `${file.name}_${file.size}`;
    console.log("📂 [Читалка] Выбран файл:", file.name);

    const exists = await checkBookExists(fileId);
    if (exists) {
        loadBookLocally(fileId);
        event.target.value = '';
        return;
    }

    currentBookTitle = "Загрузка...";
    openReaderInterface();

    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
        readerContent.innerHTML = `<div style="text-align: center; margin-top: 50px; color: rgba(255,255,255,0.5);">⏳ Анализ и распаковка книги...</div>`;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${BASE_URL}/books/upload?chat_id=${user.id}`, {
        method: 'POST',
        body: formData,
        headers: { "ngrok-skip-browser-warning": "true" }
    })
    .then(res => res.json())
    .then(async data => {
        if (data.success && data.chunks && data.chunks.length > 0) {
            currentBookChunks = data.chunks;
            localStorage.setItem(`reader_scroll_${fileId}`, 0);

            if (data.title) {
                currentBookTitle = data.title.length > 20 ? data.title.substring(0, 20) + '...' : data.title;
            } else {
                currentBookTitle = "Книга";
            }

            await saveBookLocally(fileId, currentBookTitle, currentBookChunks);

            updateReaderHeader(currentBookTitle);

            renderBookChunk();
        } else {
            if (readerContent) readerContent.innerHTML = `<div style="text-align: center; color: #ff3b30; margin-top: 50px;">❌ Ошибка: ${data.error}</div>`;
        }
        event.target.value = '';
    })
    .catch(err => {
        if (readerContent) readerContent.innerHTML = `<div style="text-align: center; color: #ff3b30; margin-top: 50px;">⚠️ Ошибка связи с сервером</div>`;
        event.target.value = '';
    });
}

// ==========================================
// 5. ОТРИСОВКА И ПРОГРЕСС-БАР (СКРОЛЛ)
// ==========================================
function renderBookChunk() {
    const readerContent = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const slider = document.getElementById('reader-theme-slider');

    if (!readerContent) return;

    if (currentBookChunks.length > 0) {
        const fullText = currentBookChunks.join("\n\n");
        const paragraphs = fullText.split(/\n+/);

        const savedLineHeight = localStorage.getItem("reader_line_height") || "1.6";
        const savedFontSize = localStorage.getItem("reader_font_size") || "18";

        const formattedHtml = paragraphs.map(p => {
            const safeText = p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
            if (!safeText) return "";
            return `<p style="text-indent: 25px; margin: 0 0 5px 0; text-align: justify; font-size: ${savedFontSize}px; line-height: ${savedLineHeight};">${safeText}</p>`;
        }).join("");

        readerContent.style.overflowY = 'auto';
        readerContent.style.flex = '1';
        readerContent.style.padding = '20px 15px';
        readerContent.style.borderRadius = '0';
        readerContent.style.border = 'none';
        readerContent.style.paddingBottom = '100px';

        readerContent.innerHTML = formattedHtml;

        if (slider) {
            slider.min = 0;
            slider.max = 100;
            slider.removeAttribute('onchange');

            if (slider.parentElement) {
                const siblingIcons = slider.parentElement.querySelectorAll('svg, img, span:not(#page-indicator)');
                siblingIcons.forEach(icon => icon.style.display = 'none');
            }

            slider.oninput = function() {
                const maxScroll = readerContent.scrollHeight - readerContent.clientHeight;
                readerContent.scrollTop = (this.value / 100) * maxScroll;
            };
        }

        const targetId = localStorage.getItem("reader_last_book_id") || "current_book";
        const savedScroll = parseInt(localStorage.getItem(`reader_scroll_${targetId}`)) || 0;

        setTimeout(() => {
            readerContent.scrollTop = savedScroll;
            updateScrollProgress();
        }, 100);

        readerContent.onscroll = () => {
            localStorage.setItem(`reader_scroll_${targetId}`, Math.round(readerContent.scrollTop));
            updateScrollProgress();
        };

        function updateScrollProgress() {
            const maxScroll = readerContent.scrollHeight - readerContent.clientHeight;
            let percent = 0;

            if (maxScroll > 0) {
                percent = Math.round((readerContent.scrollTop / maxScroll) * 100);
            }

            if (pageIndicator) {
                pageIndicator.style.display = 'block';
                pageIndicator.innerText = `Прочитано: ${percent}%`;
            }
            if (slider) {
                slider.value = percent;
            }
        }

        if (typeof applySavedTheme === 'function') applySavedTheme();
    }
}

// ==========================================
// 6. НАСТРОЙКИ В POPUP ОКНЕ (ТЕМА, ОТТЕНОК, ШРИФТ, ИНТЕРВАЛ)
// ==========================================

function openReaderSettingsModal() {
    let modal = document.getElementById('reader-settings-modal');
    const savedTheme = localStorage.getItem("reader_theme_pref") || 0;
    const savedFontSize = localStorage.getItem("reader_font_size") || 18;
    const savedLineHeight = localStorage.getItem("reader_line_height") || 1.6;
    const savedTextTint = localStorage.getItem("reader_text_tint") || 0;

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reader-settings-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);';

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(35, 48, 65, 0.95) 0%, rgba(10, 15, 22, 0.98) 100%); padding: 25px; border-radius: 20px; width: 85%; max-width: 320px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 15px 35px rgba(0,0,0,0.5); color: #fff;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">Настройки чтения</div>
                
                <!-- Оформление -->
                <div style="font-size: 13px; color: #aaa; margin-bottom: 6px; text-align: left; font-weight: bold;">Оформление</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 4px; padding: 0 5px;">
                    <span>Ночь</span>
                    <span>Сепия</span>
                    <span>День</span>
                </div>
                <input type="range" min="0" max="2" value="${savedTheme}" id="modal-theme-slider" oninput="setReaderTheme(this.value); updateTintSliderVisibility();" style="width: 100%; margin-bottom: 15px; accent-color: var(--button-color);">

                <!-- Оттенок текста (только для ночного режима) -->
                <div id="tint-control-container" style="display: ${savedTheme == 0 ? 'block' : 'none'}; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 4px; font-weight: bold;">
                        <span> Яркость текста </span>
                        <span id="text-tint-val">${savedTextTint}%</span>
                    </div>
                    <input type="range" min="0" max="100" value="${savedTextTint}" id="modal-tint-slider" oninput="setReaderTextTint(this.value)" style="width: 100%; accent-color: var(--button-color);">
                </div>
                
                <!-- Размер шрифта -->
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 4px; font-weight: bold;">
                    <span>Размер шрифта</span>
                    <span id="font-size-val">${savedFontSize}px</span>
                </div>
                <input type="range" min="14" max="26" step="1" value="${savedFontSize}" id="modal-fontsize-slider" oninput="setReaderFontSize(this.value)" style="width: 100%; margin-bottom: 15px; accent-color: var(--button-color);">

                <!-- Межстрочный интервал -->
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 4px; font-weight: bold;">
                    <span>Интервал строк</span>
                    <span id="line-height-val">${savedLineHeight}</span>
                </div>
                <input type="range" min="1.2" max="2.2" step="0.1" value="${savedLineHeight}" id="modal-lineheight-slider" oninput="setReaderLineHeight(this.value)" style="width: 100%; margin-bottom: 20px; accent-color: var(--button-color);">
                
                <button onclick="closeReaderSettingsModal()" style="width: 100%; padding: 14px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: bold; cursor: pointer;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        document.getElementById('modal-theme-slider').value = savedTheme;
        document.getElementById('modal-tint-slider').value = savedTextTint;
        document.getElementById('text-tint-val').innerText = `${savedTextTint}%`;
        document.getElementById('modal-fontsize-slider').value = savedFontSize;
        document.getElementById('font-size-val').innerText = `${savedFontSize}px`;
        document.getElementById('modal-lineheight-slider').value = savedLineHeight;
        document.getElementById('line-height-val').innerText = savedLineHeight;

        const tintContainer = document.getElementById('tint-control-container');
        if (tintContainer) {
            tintContainer.style.display = savedTheme == 0 ? 'block' : 'none';
        }
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function updateTintSliderVisibility() {
    const themeSlider = document.getElementById('modal-theme-slider');
    const tintContainer = document.getElementById('tint-control-container');
    if (themeSlider && tintContainer) {
        tintContainer.style.display = themeSlider.value == 0 ? 'block' : 'none';
    }
}

function closeReaderSettingsModal() {
    const modal = document.getElementById('reader-settings-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 250);
    }
}

function interpolateColor(color1, color2, factor) {
    let c1 = parseInt(color1.slice(1), 16);
    let c2 = parseInt(color2.slice(1), 16);
    let r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
    let r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
    let r = Math.round(r1 + factor * (r2 - r1));
    let g = Math.round(g1 + factor * (g2 - g1));
    let b = Math.round(b1 + factor * (b2 - b1));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function applyTextTint() {
    const content = document.getElementById('reader-content');
    if (!content) return;
    const currentTheme = localStorage.getItem("reader_theme_pref") || 0;

    if (currentTheme == 1 || currentTheme == 2) {
        // Сепия и День строго черные
        content.style.setProperty('color', '#000000', 'important');
    } else {
        // Ночь: смешиваем базовый #e0e0e0 с кремовым #eae3d2 по ползунку
        let baseColor = '#e0e0e0';
        let creamyColor = '#eae3d2';
        let factor = parseInt(localStorage.getItem("reader_text_tint") || 0) / 100;
        let finalColor = interpolateColor(baseColor, creamyColor, factor);
        content.style.setProperty('color', finalColor, 'important');
    }
}

function setReaderTheme(val) {
    const content = document.getElementById('reader-content');
    if (!content) return;

    if (val == 0) {
        content.style.setProperty('background', '#121212', 'important');
    } else if (val == 1) {
        content.style.setProperty('background', '#d3c6a6', 'important');
    } else if (val == 2) {
        content.style.setProperty('background', '#f5f5f5', 'important');
    }

    localStorage.setItem("reader_theme_pref", val);
    applyTextTint();
}

function setReaderTextTint(tint) {
    localStorage.setItem("reader_text_tint", tint);
    const valEl = document.getElementById('text-tint-val');
    if (valEl) valEl.innerText = `${tint}%`;
    applyTextTint();
}

function setReaderFontSize(size) {
    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
        const paragraphs = readerContent.querySelectorAll('p');
        paragraphs.forEach(p => p.style.fontSize = `${size}px`);
    }
    const valEl = document.getElementById('font-size-val');
    if (valEl) valEl.innerText = `${size}px`;
    localStorage.setItem("reader_font_size", size);
}

function setReaderLineHeight(lh) {
    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
        const paragraphs = readerContent.querySelectorAll('p');
        paragraphs.forEach(p => p.style.lineHeight = lh);
    }
    const valEl = document.getElementById('line-height-val');
    if (valEl) valEl.innerText = lh;
    localStorage.setItem("reader_line_height", lh);
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem("reader_theme_pref");
    if (savedTheme !== null) {
        setReaderTheme(savedTheme);
    } else {
        setReaderTheme(0);
    }

    const savedFontSize = localStorage.getItem("reader_font_size") || "18";
    setReaderFontSize(savedFontSize);

    const savedLineHeight = localStorage.getItem("reader_line_height") || "1.6";
    setReaderLineHeight(savedLineHeight);
}

// ==========================================
// 7. ВОЗВРАТ ИЗ ЧИТАЛКИ И ПЕРЕХВАТ ПЕРЕВОДА
// ==========================================
const origExitToMenuReader = window.exitToMainMenu;
window.exitToMainMenu = function() {

    const titleEl = document.getElementById('top-bar-title');
    if (titleEl) {
        titleEl.style.maxWidth = 'none';
    }

    if (window.returnToReader) {
        window.returnToReader = false;

        const translatorInput = document.getElementById('quick-translator-input');
        if (translatorInput) translatorInput.value = "";

        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) chatContainer.innerHTML = '';

        if (typeof loadBookLocally === 'function') {
            loadBookLocally();
        }
        return;
    }

    if (origExitToMenuReader) origExitToMenuReader();

    const readerContainer = document.getElementById('reader-container');
    if (readerContainer) readerContainer.style.display = 'none';

    const outputArea = document.getElementById('output-area');
    if (outputArea) {
        outputArea.style.padding = '20px';
    }

    const translateBtn = document.getElementById('reader-translate-btn');
    if (translateBtn) translateBtn.style.display = 'none';

    window.getSelection().removeAllRanges();
};

let selectedTextToTranslate = "";

document.addEventListener('selectionchange', () => {
    if (window.currentAppMode !== 'text_reader') return;

    const translateBtn = document.getElementById('reader-translate-btn');
    if (!translateBtn) return;

    const selection = window.getSelection();
    selectedTextToTranslate = selection.toString().trim();

    if (selectedTextToTranslate.length > 0 && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 || rect.height > 0) {
            translateBtn.innerText = "✨ Перевести";
            translateBtn.style.display = 'flex';
            translateBtn.style.alignItems = 'center';
            translateBtn.style.justifyContent = 'center';
            translateBtn.style.transform = 'none';
            translateBtn.style.width = 'max-content';
            translateBtn.style.height = 'auto';
            translateBtn.style.fontSize = '14px';
            translateBtn.style.padding = '8px 16px';

            translateBtn.style.top = `${rect.bottom + 25}px`;
            translateBtn.style.bottom = 'auto';

            const btnWidth = translateBtn.offsetWidth || 120;
            let leftPos = rect.left - (btnWidth / 2);

            leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - btnWidth - 10));
            translateBtn.style.left = `${leftPos}px`;
        }
    } else {
        translateBtn.style.display = 'none';
    }
});

const translateBtn = document.getElementById('reader-translate-btn');
if (translateBtn) {
    translateBtn.addEventListener('click', () => {
        if (!selectedTextToTranslate) return;

        translateBtn.style.display = 'none';
        window.getSelection().removeAllRanges();

        if (typeof window.exitToMainMenu === 'function') {
            window.exitToMainMenu();
        }

        window.returnToReader = true;

        const translatorInput = document.getElementById('quick-translator-input');
        if (translatorInput) {
            translatorInput.value = selectedTextToTranslate;
            if (typeof toggleTranslatorIcon === 'function') {
                toggleTranslatorIcon(translatorInput);
            }
            setTimeout(() => {
                if (typeof startQuickTranslation === 'function') {
                    startQuickTranslation();
                }
            }, 150);
        }
    });
}