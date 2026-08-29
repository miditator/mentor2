// ==========================================
// 🗺️ КАРТА ЗНАНИЙ (СЕМАНТИКА + ГРАММАТИКА)
// ==========================================

let semanticClusters = [];

function openSemanticMap() {
    // 🔥 Остановка 3D-ментора для оптимизации
    const mentorBg = document.getElementById('mentor-3d-bg');
    const pbCol = document.querySelector('.pb-bars-col');
    if (mentorBg) mentorBg.style.visibility = 'hidden';
    if (pbCol) pbCol.style.visibility = 'hidden';

    let overlay = document.getElementById('semantic-map-modal');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'semantic-map-modal';
        overlay.className = 'semantic-map-overlay';

        overlay.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; max-width: 400px; margin: 0 auto; padding: 20px 15px; box-sizing: border-box;">
                
                <!-- Шапка -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🗺️</span>
                        <span style="font-size: 16px; font-weight: bold; color: #fff;">Карта Знаний</span>
                    </div>
                    <button onclick="closeSemanticMap()" style="background: rgba(255,255,255,0.1); border: none; width: 34px; height: 34px; border-radius: 50%; color: #fff; font-size: 16px; cursor: pointer;">✕</button>
                </div>

                <!-- Переключатель вкладок -->
                <div style="display: flex; background: rgba(0,0,0,0.4); border-radius: 12px; padding: 4px; width: 100%; margin-bottom: 10px; flex-shrink: 0;">
                    <button id="tab-btn-semantic" onclick="switchKnowledgeTab('semantic')" style="flex: 1; padding: 8px; border: none; border-radius: 10px; background: rgba(56,189,248,0.2); color: #38bdf8; font-weight: bold; cursor: pointer; transition: all 0.2s;">🌌 Лексика</button>
                    <button id="tab-btn-grammar" onclick="switchKnowledgeTab('grammar')" style="flex: 1; padding: 8px; border: none; border-radius: 10px; background: transparent; color: #94a3b8; font-weight: bold; cursor: pointer; transition: all 0.2s;">📚 Грамматика</button>
                </div>

              <!-- Рабочая зона (строго по центру, без съезжаний) -->
                <div style="position: relative; flex: 1; width: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                    
                    <!-- ВКЛАДКА 1: СЕМАНТИЧЕСКАЯ КАРТА (Жесткий фиксированный холст 360x360) -->
                    <div id="tab-content-semantic" style="display: block; position: relative; width: 360px; height: 360px; flex-shrink: 0;">
                        <div id="semantic-nodes-wrapper" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                            
                            <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;" id="synapses-svg">
                                <defs>
                                    <linearGradient id="synapseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#38bdf8" />
                                        <stop offset="100%" stop-color="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <!-- МОЗГ СТРОГО ПО ЦЕНТРУ ХОЛСТА (180px) -->
                         <!-- Мозг поднят выше вместе с графом -->
                    <div class="semantic-core" style="position: absolute; left: 180px; top: 140px; transform: translate(-50%, -50%); z-index: 10; margin: 0;" onclick="onCoreClick()">
                        <span style="font-size: 22px;">🧠</span>
                        <span style="font-size: 8px; color: #38bdf8; font-weight: bold; margin-top: 1px;">РАЗУМ</span>
                    </div>

                        </div>
                    </div>

                    <!-- ВКЛАДКА 2: ГРАММАТИКА -->
                    <div id="tab-content-grammar" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; overflow-y: auto; padding-right: 4px; box-sizing: border-box;">
                        <div id="grammar-stats-list" style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 400px; margin: 0 auto; padding-bottom: 20px;">
                            <div style="text-align: center; color: var(--hint-color); font-size: 12px; margin-top: 40px;">Загрузка статистики...</div>
                        </div>
                    </div>

                </div>

                </div>
            </div>

            <!-- Карточка деталей узла -->
            <div class="semantic-details-card" id="semantic-details-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div id="node-modal-title" style="font-size: 16px; font-weight: bold; color: #fff;">Кластер</div>
                    <span id="node-modal-count" style="font-size: 11px; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 4px 8px; border-radius: 8px;">0 слов</span>
                </div>
                <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 12px;">Активные слова:</div>
                <div id="node-modal-words" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 15px; max-height: 150px; overflow-y: auto;"></div>
                <button onclick="closeNodeDetails()" class="btn-glass" style="width: 100%; padding: 10px; font-size: 14px;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    switchKnowledgeTab('semantic');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('active'));

    loadSemanticMapData();
    loadGrammarStatsData();
}

function switchKnowledgeTab(tabName) {
    const tabSemBtn = document.getElementById('tab-btn-semantic');
    const tabGramBtn = document.getElementById('tab-btn-grammar');
    const contentSem = document.getElementById('tab-content-semantic');
    const contentGram = document.getElementById('tab-content-grammar');
    const detailsCard = document.getElementById('semantic-details-card');

    if (tabName === 'semantic') {
        tabSemBtn.style.background = 'rgba(56,189,248,0.2)';
        tabSemBtn.style.color = '#38bdf8';
        tabGramBtn.style.background = 'transparent';
        tabGramBtn.style.color = '#94a3b8';

        contentSem.style.display = 'block';
        contentGram.style.display = 'none';
    } else {
        tabSemBtn.style.background = 'transparent';
        tabSemBtn.style.color = '#94a3b8';
        tabGramBtn.style.background = 'rgba(168,85,247,0.2)';
        tabGramBtn.style.color = '#a855f7';

        contentSem.style.display = 'none';
        contentGram.style.display = 'block';
        if (detailsCard) detailsCard.classList.remove('active');
    }
}

function loadGrammarStatsData() {
    apiFetch(`/semantic/grammar-stats?chat_id=${user.id}`)
        .then(data => {
            const listContainer = document.getElementById('grammar-stats-list');
            if (data.success && data.rules) {
                renderGrammarStats(data.rules, listContainer);
            } else {
                listContainer.innerHTML = `<div style="text-align: center; color: #ff453a; font-size: 12px; margin-top: 20px;">Ошибка загрузки грамматики</div>`;
            }
        })
        .catch(err => console.error("Ошибка сети при загрузке грамматики:", err));
}

function renderGrammarStats(rules, container) {
    if (rules.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--hint-color); font-size: 13px; margin-top: 20px;">Нет правил для отображения</div>`;
        return;
    }

    container.innerHTML = rules.map(r => {
        const mastery = r.progress_rule !== undefined ? r.progress_rule : 0;

        let color = '#34d399'; // Зеленый
        let shadowColor = 'rgba(52, 211, 153, 0.4)';

        if (mastery < 50) {
            color = '#ff453a'; // Красный
            shadowColor = 'rgba(255, 69, 58, 0.4)';
        } else if (mastery < 90) {
            color = '#f59e0b'; // Оранжевый
            shadowColor = 'rgba(245, 158, 11, 0.4)';
        }

        const safeRuleAttr = r.rule.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <div class="dict-word-card" style="display: block; padding: 14px 16px;" onclick="explainRule('${safeRuleAttr}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
                    <span style="color: #f8fafc; font-size: 14px; font-weight: 500; text-align: left; line-height: 1.3;">${r.rule}</span>
                    <span class="dict-percent-badge" style="background: rgba(255, 255, 255, 0.05); color: ${color}; border: 1px solid ${color}40; width: auto; height: auto;">${mastery}%</span>
                </div>
                <div style="width: 100%; height: 4px; background: rgba(0, 0, 0, 0.3); border-radius: 2px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.04);">
                    <div style="height: 100%; width: ${mastery}%; background: ${color}; border-radius: 2px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        `;
    }).join('');
}

function loadSemanticMapData() {
    if (typeof showAiLoader === 'function') {
        showAiLoader("🌌 Сканирую семантическое ядро...");
    }

    apiFetch(`/semantic/map?chat_id=${user.id}`)
        .then(data => {
            if (data.success && data.categories) {
                semanticClusters = data.categories;
                renderSemanticMapNodes();
            } else {
                semanticClusters = [];
                renderSemanticMapNodes();
            }
        })
        .finally(() => {
            if (typeof hideAiLoader === 'function') hideAiLoader();
        });
}

function renderSemanticMapNodes() {
    const wrapper = document.getElementById('semantic-nodes-wrapper');
    const svg = document.getElementById('synapses-svg');

    if (!wrapper || !svg) return;

    wrapper.querySelectorAll('.semantic-node').forEach(n => n.remove());
    svg.querySelectorAll('line').forEach(l => l.remove());

    const totalClusters = semanticClusters.length;

    const centerX = 180;
    const centerY = 140; // Мозг держим ближе к шапке

    if (totalClusters === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'semantic-node';
        emptyMsg.style.left = `${centerX}px`;
        emptyMsg.style.top = `${centerY + 70}px`;
        emptyMsg.style.transform = 'translate(-50%, -50%)scale(1.1)';
        emptyMsg.style.width = '140px';
        emptyMsg.innerHTML = `<span style="font-size: 11px; color: #94a3b8; text-align: center;">Словарь пуст. Добавь слова!</span>`;
        wrapper.appendChild(emptyMsg);
        return;
    }

    const totalWords = semanticClusters.reduce((sum, cluster) => sum + (cluster.count || 0), 0);

    // 🔥 РЕГУЛЯТОРЫ РАЗМЕРА (можешь менять эти цифры под себя прямо здесь):
    const WIDTH_FACTOR = 1.2;  // Меньше 1.0 — сужает эллипс по ширине, больше 1.0 — расширяет
    const HEIGHT_FACTOR = 1.2; // Больше 1.0 — сильнее вытягивает эллипс в высоту вверх и вниз

    semanticClusters.forEach((cluster, index) => {
        // Узкая база по горизонтали и сильно увеличенная по вертикали
        const baseRx = (index % 2 === 0 ? 75 : 105) * WIDTH_FACTOR;
        const baseRy = (index % 2 === 0 ? 120 : 165) * HEIGHT_FACTOR; // Сильно раздвинули в высоту

        const angle = (index / totalClusters) * 2 * Math.PI;

        const absX = centerX + baseRx * Math.cos(angle);
        const absY = centerY + baseRy * Math.sin(angle);

        const percentage = totalWords > 0 ? (cluster.count || 0) / totalWords : 0;
        const strokeWidth = 0.1 + (percentage * 3.5);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', absX);
        line.setAttribute('y2', absY);
        line.setAttribute('class', 'synapse-line');
        line.style.strokeWidth = `${strokeWidth}px`;
        line.style.opacity = 0.2 + (percentage * 0.5);

        svg.appendChild(line);

        const node = document.createElement('div');
        node.className = 'semantic-node';
        node.style.position = 'absolute';
        node.style.left = `${absX}px`;
        node.style.top = `${absY}px`;
        node.style.transform = 'translate(-50%, -50%)';
        node.style.padding = '4px 6px';
        node.style.minWidth = '55px';
        node.style.borderRadius = '12px';

        const icon = cluster.icon || "📁";
        const count = cluster.count || 0;

        node.innerHTML = `
            <span style="font-size: 11px; margin-bottom: 1px;">${icon}</span>
            <span style="font-size: 8px; font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55px;">${cluster.name}</span>
            <span style="font-size: 7px; color: #94a3b8; margin-top: 0px;">${count} слов</span>
        `;

        node.onclick = () => selectSemanticNode(cluster, node);
        wrapper.appendChild(node);
    });
}

function selectSemanticNode(cluster, nodeElement) {
    document.querySelectorAll('.semantic-node').forEach(n => n.classList.remove('selected'));
    nodeElement.classList.add('selected');

    document.getElementById('node-modal-title').innerText = `${cluster.icon || '📁'} ${cluster.name}`;
    document.getElementById('node-modal-count').innerText = `${cluster.count || 0} слов`;

    const wordsContainer = document.getElementById('node-modal-words');
    const wordsList = cluster.words || [];

    if (wordsList.length > 0) {
        wordsContainer.innerHTML = wordsList.map(w => `
            <span style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; padding: 4px 10px; border-radius: 8px; font-size: 12px;">${w}</span>
        `).join('');
    } else {
        wordsContainer.innerHTML = `<span style="font-size: 12px; color: #94a3b8;">В этом синапсе пока нет слов.</span>`;
    }

    document.getElementById('semantic-details-card').classList.add('active');
}

function closeNodeDetails() {
    document.getElementById('semantic-details-card').classList.remove('active');
    document.querySelectorAll('.semantic-node').forEach(n => n.classList.remove('selected'));
}

function onCoreClick() {
    if (typeof showAiLoader === 'function') {
        showAiLoader("🧠 Твой синаптический индекс в норме!");
        setTimeout(hideAiLoader, 2000);
    }
}

function closeSemanticMap() {
    const overlay = document.getElementById('semantic-map-modal');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 400);
    }

    // Пробуждение 3D-ментора
    const mentorBg = document.getElementById('mentor-3d-bg');
    const pbCol = document.querySelector('.pb-bars-col');
    if (mentorBg) mentorBg.style.visibility = 'visible';
    if (pbCol) pbCol.style.visibility = 'visible';
}