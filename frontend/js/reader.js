// ==========================================
// ФАЙЛ: frontend/js/reader.js
// БЕЗОПАСНАЯ ТЕСТОВАЯ ВЕРСИЯ
// ==========================================

let currentBookChunks = [];
let currentChunkIndex = 0;
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

async function saveBookLocally(title, chunks) {
    try {
        const db = await initLocalDB();
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        store.put({ title: title, chunks: chunks }, "current_book");
    } catch (err) {
        console.error("Ошибка сохранения книги:", err);
    }
}

async function loadBookLocally() {
    try {
        const db = await initLocalDB();
        const tx = db.transaction("books", "readonly");
        const store = tx.objectStore("books");
        const request = store.get("current_book");

        request.onsuccess = () => {
            const data = request.result;
            if (data && data.chunks && data.chunks.length > 0) {
                currentBookChunks = data.chunks;
                currentChunkIndex = parseInt(localStorage.getItem("reader_current_page")) || 0;
                currentBookTitle = data.title || "Чтение";

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
    initLocalDB().then(db => {
        const tx = db.transaction("books", "readonly");
        const store = tx.objectStore("books");
        const request = store.get("current_book");

        request.onsuccess = () => {
            if (request.result && request.result.chunks) {
                // Если книга есть, показываем наше кастомное окно
                const modal = document.getElementById('reader-choice-modal');
                const titleEl = document.getElementById('rc-modal-title');

                if (modal && titleEl) {
                    titleEl.innerText = request.result.title || "Сохраненная книга";
                    modal.style.display = 'flex';
                    setTimeout(() => modal.style.opacity = '1', 10);
                } else {
                    // Запасной вариант, если HTML не прогрузился
                    loadBookLocally();
                }
            } else {
                // Если книги нет, сразу предлагаем загрузить
                document.getElementById('book-upload-input').click();
            }
        };
    }).catch(() => {
        document.getElementById('book-upload-input').click();
    });
}

// Функции управления новым модальным окном
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
    localStorage.setItem("reader_current_page", 0);
    document.getElementById('book-upload-input').click();
}




// 2. Переключение интерфейса
// 2. Переключение интерфейса (С ЖЕСТКОЙ ВЫСОТОЙ)
function openReaderInterface() {
    console.log("🔧 [Читалка] Открываем интерфейс...");
    window.currentAppMode = 'text_reader';

    if (typeof setAppHeader === 'function') setAppHeader(currentBookTitle, true);

    const hideList = ['main-menu-cards', 'quick-translator-block', 'live-chat-block', 'chat-messages', 'input-container', 'mini-profile'];
    hideList.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 🔥 Убираем отступы у родительского окна, чтобы читалка прилипла к краям
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
        readerContainer.style.minHeight = '85vh'; // Делаем максимально высоким
        readerContainer.style.background = 'rgba(20, 20, 25, 0.6)';
        readerContainer.style.borderRadius = '0'; // Убираем скругления
        readerContainer.style.padding = '0'; // Убираем отступы
        readerContainer.style.marginTop = '0';

        if (typeof applySavedTheme === 'function') applySavedTheme();
    }
}

// 3. Отправка на сервер
// 3. Отправка на сервер
// 3. Отправка на сервер
function handleBookUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log("📂 [Читалка] Загружаем файл:", file.name);

    // Временно ставим имя файла, пока ждем ответ сервера
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
    // 🔥 ДОБАВИЛ ASYNC СЮДА
    .then(async data => {
        if (data.success && data.chunks && data.chunks.length > 0) {
            currentBookChunks = data.chunks;
            currentChunkIndex = 0;

            // 🔥 Сбрасываем страницу на начало для новой книги
            localStorage.setItem("reader_current_page", 0);

            // ОБРАБАТЫВАЕМ ЗАГОЛОВОК ОТ СЕРВЕРА
            if (data.title) {
                // Если название больше 20 символов, обрезаем и ставим троеточие
                currentBookTitle = data.title.length > 20 ? data.title.substring(0, 20) + '...' : data.title;
            } else {
                currentBookTitle = "Книга";
            }

            // 🔥 СОХРАНЯЕМ В ПАМЯТЬ ТЕЛЕФОНА (Вот этой функции не хватало!)
            await saveBookLocally(currentBookTitle, currentBookChunks);

            // Обновляем шапку с новым красивым названием
            if (typeof setAppHeader === 'function') {
                setAppHeader(currentBookTitle, true);
            }

            renderBookChunk();
        } else {
            if (readerContent) readerContent.innerHTML = `<div style="text-align: center; color: #ff3b30; margin-top: 50px;">❌ Ошибка: ${data.error}</div>`;
        }
    })
    .catch(err => {
        console.error("🔥 [Читалка] Ошибка запроса:", err);
        if (readerContent) readerContent.innerHTML = `<div style="text-align: center; color: #ff3b30; margin-top: 50px;">⚠️ Ошибка связи с сервером</div>`;
    });
}

// 4. Отрисовка
// 4. Отрисовка (С ЖЕСТКИМ ЦВЕТОМ ТЕКСТА)
// 4. Отрисовка (С КНИЖНОЙ ВЕРСТКОЙ)
// 2. ОТРИСОВКА (УБРАЛИ ЖЕСТКИЙ БЕЛЫЙ ЦВЕТ)
function renderBookChunk() {
    const readerContent = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    if (!readerContent) return;

    if (currentBookChunks.length > 0) {
        const rawText = currentBookChunks[currentChunkIndex] || "Пустая страница";
        const paragraphs = rawText.split(/\n+/);

        const formattedHtml = paragraphs.map(p => {
            const safeText = p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
            if (!safeText) return "";
            return `<p style="text-indent: 25px; margin: 0 0 5px 0; text-align: justify; line-height: 1.6;">${safeText}</p>`;
        }).join("");

        readerContent.style.fontSize = '18px'; // Сделали шрифт чуть крупнее
        readerContent.style.overflowY = 'auto';
        readerContent.style.flex = '1';
        readerContent.style.padding = '20px 15px'; // Внутренние отступы самого текста
        readerContent.style.borderRadius = '0';
        readerContent.style.border = 'none'; // Убрали рамку

        readerContent.innerHTML = formattedHtml;

        if (pageIndicator) pageIndicator.innerText = `Стр. ${currentChunkIndex + 1} / ${currentBookChunks.length}`;
        readerContent.scrollTop = 0;
        localStorage.setItem("reader_current_page", currentChunkIndex);

        // 🔥 Принудительно применяем тему после отрисовки текста!
        if (typeof applySavedTheme === 'function') applySavedTheme();
    }
}

// 5. Кнопки
function prevBookPage() {
    if (currentChunkIndex > 0) { currentChunkIndex--; renderBookChunk(); }
}
function nextBookPage() {
    if (currentChunkIndex < currentBookChunks.length - 1) { currentChunkIndex++; renderBookChunk(); }
}
// ==========================================
// 5. ТЕМЫ ОФОРМЛЕНИЯ И СВАЙПЫ
// ==========================================

// Логика смены темы
// 3. НОВЫЕ ЦВЕТА (ПРИНУДИТЕЛЬНО ЧЕРНЫЙ ТЕКСТ)
function changeReaderTheme() {
    const slider = document.getElementById('reader-theme-slider');
    const content = document.getElementById('reader-content');
    if (!slider || !content) return;

    const val = slider.value;

    if (val == 0) {
        // 0: Ночь
        content.style.setProperty('background', '#121212', 'important');
        content.style.setProperty('color', '#e0e0e0', 'important');
    } else if (val == 1) {
        // 1: Сепия (Темно-желтоватая бумага, полностью черный текст)
        content.style.setProperty('background', '#d3c6a6', 'important');
        content.style.setProperty('color', '#000000', 'important');
    } else if (val == 2) {
        // 2: День (Светлый фон, полностью черный текст)
        content.style.setProperty('background', '#f5f5f5', 'important');
        content.style.setProperty('color', '#000000', 'important');
    }
    localStorage.setItem("reader_theme_pref", val);
}

// Применяем сохраненную тему при открытии
function applySavedTheme() {
    const savedTheme = localStorage.getItem("reader_theme_pref");
    const slider = document.getElementById('reader-theme-slider');
    if (savedTheme !== null && slider) {
        slider.value = savedTheme;
        changeReaderTheme();
    }
}

// Логика свайпов
let touchstartX = 0;
let touchendX = 0;

function handleSwipe() {
    const threshold = 60; // Минимальная длина свайпа в пикселях
    if (touchendX < touchstartX - threshold) {
        nextBookPage(); // Свайп влево -> следующая страница
    }
    if (touchendX > touchstartX + threshold) {
        prevBookPage(); // Свайп вправо -> предыдущая страница
    }
}

// Инициализация событий при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
        readerContent.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, {passive: true});

        readerContent.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});
    }
});

// 4. ПРИ ВЫХОДЕ ВОЗВРАЩАЕМ ОТСТУПЫ ГЛАВНОМУ МЕНЮ
const origExitToMenuReader = window.exitToMainMenu;
window.exitToMainMenu = function() {
    if (origExitToMenuReader) origExitToMenuReader();

    const readerContainer = document.getElementById('reader-container');
    if (readerContainer) readerContainer.style.display = 'none';

    // 🔥 ВОЗВРАЩАЕМ СТАНДАРТНЫЕ ОТСТУПЫ ОБРАТНО
    const outputArea = document.getElementById('output-area');
    if (outputArea) {
        outputArea.style.padding = '20px';
    }

    const translateBtn = document.getElementById('reader-translate-btn');
    if (translateBtn) translateBtn.style.display = 'none';

    window.getSelection().removeAllRanges();
};

// ==========================================
// 6. ПЕРЕХВАТ ВЫДЕЛЕНИЯ И ПЕРЕВОД (ПОД СЛОВОМ СЛЕВА)
// ==========================================

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

            // 🔥 Отступаем 25px вниз от нижней границы слова, чтобы не мешали маркеры Android
            translateBtn.style.top = `${rect.bottom + 25}px`;
            translateBtn.style.bottom = 'auto';

            // 🔥 Центр плашки ставим ровно на левый край слова (rect.left)
            const btnWidth = translateBtn.offsetWidth || 120;
            let leftPos = rect.left - (btnWidth / 2);

            // Защита, чтобы кнопка не обрезалась левым краем экрана
            leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - btnWidth - 10));
            translateBtn.style.left = `${leftPos}px`;
        }
    } else {
        translateBtn.style.display = 'none';
    }
});

// Обработка клика по кнопке
const translateBtn = document.getElementById('reader-translate-btn');
if (translateBtn) {
    translateBtn.addEventListener('click', () => {
        if (!selectedTextToTranslate) return;

        translateBtn.style.display = 'none';
        window.getSelection().removeAllRanges();

        // 🔥 СТАВИМ ФЛАГ: МЫ ПРИШЛИ ИЗ ЧИТАЛКИ И ХОТИМ ВЕРНУТЬСЯ
        window.returnToReader = true;

        if (typeof window.exitToMainMenu === 'function') {
            window.exitToMainMenu();
        }

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