// ==========================================
// ФАЙЛ: frontend/js/progress_bars.js
// ==========================================

function initProgressBars() {
    const containerEl = document.getElementById('progress-banner-block');
    if (!containerEl) return;

    const userLang = (window.userProfile && window.userProfile.language === 'de') ? 'de' : 'en';

    const content = {
        en: { row1: 'Изучение слов', row2: 'Тренировка фраз' },
        de: { row1: 'Wortschatz lernen', row2: 'Grammatik üben' }
    };

    const current = content[userLang] || content.en;

    let wordsPercent = 0;
    let phrasesPercent = 0;

    if (window.userProfile) {
        const wordsToday = window.userProfile.words_today || 0;
        const wordsGoal = window.userProfile.words_per_day || 5;
        wordsPercent = wordsGoal > 0 ? Math.round((wordsToday / wordsGoal) * 100) : 0;

        const phrasesToday = window.userProfile.phrases_today || 0;
        const phrasesGoal = window.userProfile.phrases_per_day || 10;
        phrasesPercent = phrasesGoal > 0 ? Math.round((phrasesToday / phrasesGoal) * 100) : 0;
    }

    wordsPercent = Math.max(0, Math.min(100, wordsPercent));
    phrasesPercent = Math.max(0, Math.min(100, phrasesPercent));

    if (!containerEl.querySelector('.pb-wrapper')) {
        containerEl.style.cssText = '';
        containerEl.className = 'pb-main-container';

        containerEl.innerHTML = `
            <div class="pb-wrapper" style="position: relative; width: 100%; min-height: 140px; border-radius: 16px; overflow: hidden; background: rgba(0,0,0,0.2); box-sizing: border-box;">
                
                <!-- 3D ФОН -->
                <div id="mentor-3d-bg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">
                    <div id="mentor-3d-container" style="width: 100%; height: 100%; position: relative;"></div>
                </div>

                <!-- 🔥 КЛИКАБЕЛЬНЫЕ ЗОНЫ (Прозрачные блоки) -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; display: flex;">
                    <!-- Левая зона (Кровать) -->
                    <div onclick="window.triggerInteraction('bed')" style="flex: 1.2; cursor: pointer; pointer-events: auto;"></div>
                    <!-- Центр (Кресло) -->
                    <div onclick="window.triggerInteraction('chair')" style="flex: 1; cursor: pointer; pointer-events: auto;"></div>
                    <!-- Правая зона (Ментор / Точка 1) -->
                    <div onclick="window.triggerInteraction('home')" style="flex: 1.2; cursor: pointer; pointer-events: auto;"></div>
                </div>

                <!-- ИНТЕРФЕЙС ПРОГРЕСС-БАРОВ (Пропускает клики насквозь через pointer-events: none) -->
                <div style="position: relative; z-index: 2; display: flex; align-items: center; width: 100%; height: 100%; padding: 0 16px; box-sizing: border-box; gap: 16px; pointer-events: none;">
                    
                    <div class="pb-bars-col" style="flex: 2; display: flex; flex-direction: column; gap: 12px; pointer-events: none;">
                        <div class="pb-row">
                            <div class="pb-header">
                                <span class="pb-title" id="pb-title-1" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${current.row1}</span>
                                <span class="pb-value" id="pb-val-1" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${wordsPercent}%</span>
                            </div>
                            <div class="pb-track" style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);">
                                <div class="pb-fill" id="pb-fill-1" style="width: ${wordsPercent}%;"></div>
                            </div>
                        </div>

                        <div class="pb-row">
                            <div class="pb-header">
                                <span class="pb-title" id="pb-title-2" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${current.row2}</span>
                                <span class="pb-value" id="pb-val-2" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${phrasesPercent}%</span>
                            </div>
                            <div class="pb-track" style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);">
                                <div class="pb-fill pb-fill-purple" id="pb-fill-2" style="width: ${phrasesPercent}%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pb-mentor-block" style="flex: 1; height: 100%; pointer-events: none;">
                    </div>

                </div>

                <div id="mentor-identity-tooltip" style="display: none; position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.98) 0%, rgba(8, 12, 18, 1) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-left: 3px solid #38bdf8; padding: 12px 14px; border-radius: 12px; font-size: 12px; color: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 25px rgba(0,0,0,0.6); z-index: 100; width: 200px; line-height: 1.4; opacity: 0; transition: opacity 0.3s; pointer-events: none;">
                </div>
            </div>
        `;

        if (typeof init3DMentor === 'function') {
            init3DMentor();
        }
    } else {
        document.getElementById('pb-title-1').innerText = current.row1;
        document.getElementById('pb-val-1').innerText = `${wordsPercent}%`;
        document.getElementById('pb-fill-1').style.width = `${wordsPercent}%`;

        document.getElementById('pb-title-2').innerText = current.row2;
        document.getElementById('pb-val-2').innerText = `${phrasesPercent}%`;
        document.getElementById('pb-fill-2').style.width = `${phrasesPercent}%`;
    }
}

// 🔥 Новый роутер кликов (связывает HTML и класс персонажа)
window.triggerInteraction = function(target) {
    // Показываем плашку модели только если кликнули по самому роботу (правая зона)
    if (target === 'home' && typeof checkMentorIdentity === 'function') {
        checkMentorIdentity();
    }

    // Отправляем команду в Стейт-Машину персонажа, явно обращаясь к window
    if (window.characterInstance) {
        window.characterInstance.command(target);
    }
};