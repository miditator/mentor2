// ==========================================
// ФАЙЛ: frontend/js/dictionary.js
// ==========================================

let dictionaryWords = [];
let filteredDictionaryWords = [];
let dictionaryCurrentPage = 0;
const WORDS_PER_PAGE = 30;

function showFullDictionary() {
    window.currentAppMode = 'dictionary';
    setAppHeader('📚 Мой словарь', true);

    if (document.getElementById('main-menu-cards')) document.getElementById('main-menu-cards').style.display = 'none';
    if (document.getElementById('quick-translator-block')) document.getElementById('quick-translator-block').style.display = 'none';
    if (document.getElementById('input-container')) document.getElementById('input-container').style.display = 'none';
    if (document.getElementById('fab-add-word')) document.getElementById('fab-add-word').style.display = 'flex';
    if (document.getElementById('live-chat-block')) document.getElementById('live-chat-block').style.display = 'none';

    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);"><i>⏳ Загрузка словаря...</i></div>';

    apiFetch(`/words/all?chat_id=${user.id}`)
        .then(data => {
            if (data.success && data.words && data.words.length > 0) {
                // Разворачиваем массив, чтобы последние добавленные были первыми
                dictionaryWords = data.words.reverse();
                filteredDictionaryWords = [...dictionaryWords];
                dictionaryCurrentPage = 0;

                chatContainer.innerHTML = `
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; margin-top: 10px; color: var(--text-color); text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                        Всего слов: <span id="dict-count">${dictionaryWords.length}</span>
                    </div>
                    
                    <div style="position: sticky; top: 0; background: var(--bg-color); padding-bottom: 10px; z-index: 10;">
                        <input type="text" id="dict-search" oninput="filterDictionary(this.value)" placeholder="🔍 Поиск по слову или переводу..." style="width: 100%; padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(112,132,153,0.3); background: var(--secondary-bg-color); color: var(--text-color); font-size: 15px; box-sizing: border-box; outline: none; transition: 0.2s;">
                    </div>
                    
                    <div id="dict-list-wrapper"></div>
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

    const start = dictionaryCurrentPage * WORDS_PER_PAGE;
    const end = start + WORDS_PER_PAGE;
    const pageWords = filteredDictionaryWords.slice(start, end);

    if (pageWords.length === 0 && dictionaryCurrentPage === 0) {
        listWrapper.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--hint-color);">Ничего не найдено 🤷‍♂️</div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    pageWords.forEach(w => {
        let foreign = w.word_foreign || w.foreign || w[0];
        let ru = w.word_ru || w.ru || w[1];
        let score = w.score !== undefined ? w.score : (w[2] || 0);
        let percent = Math.round((score / 5) * 100);

        let percentColor = percent >= 80 ? '#34c759' : (percent >= 40 ? '#ff9f0a' : '#ff3b30');

        html += `
            <div style="background: var(--secondary-bg-color); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(112,132,153,0.2); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 4px; max-width: 75%;">
                    <span style="font-size: 16px; font-weight: bold; color: var(--text-color); word-wrap: break-word;">${foreign}</span>
                    <span style="font-size: 13px; color: var(--hint-color); word-wrap: break-word;">${ru}</span>
                </div>
                <div style="font-size: 12px; font-weight: bold; color: ${percentColor}; background: rgba(112,132,153,0.1); padding: 4px 8px; border-radius: 8px; white-space: nowrap;">
                    ${percent}%
                </div>
            </div>
        `;
    });

    html += '</div>';

    const oldBtn = document.getElementById('load-more-dict-btn');
    if (oldBtn) oldBtn.remove();

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