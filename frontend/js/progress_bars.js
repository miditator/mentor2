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
    const mentorAvatarSrc = 'frontend/img/mentor.jpg';

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

    containerEl.style.cssText = '';
    containerEl.className = 'pb-main-container';

    containerEl.innerHTML = `
        <div class="pb-wrapper" style="position: relative;">
            <div class="pb-bars-col">
                
                <div class="pb-row">
                    <div class="pb-header">
                        <span class="pb-title">${current.row1}</span>
                        <span class="pb-value">${wordsPercent}%</span>
                    </div>
                    <div class="pb-track">
                        <!-- Верхняя полоска для слов (стандартная кремовая) -->
                        <div class="pb-fill" style="width: ${wordsPercent}%;"></div>
                    </div>
                </div>

                <div class="pb-row">
                    <div class="pb-header">
                        <span class="pb-title">${current.row2}</span>
                        <span class="pb-value">${phrasesPercent}%</span>
                    </div>
                    <div class="pb-track">
                        <!-- Нижняя полоска для фраз с фиолетовым градиентом -->
                        <div class="pb-fill pb-fill-purple" style="width: ${phrasesPercent}%;"></div>
                    </div>
                </div>

            </div>
            
            <div class="pb-avatar" onclick="checkMentorIdentity()" style="cursor: pointer; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                <img src="${mentorAvatarSrc}" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
            </div>

            <div id="mentor-identity-tooltip" style="display: none; position: absolute; top: -10px; right: 88px; background: linear-gradient(135deg, rgba(20, 30, 45, 0.98) 0%, rgba(8, 12, 18, 1) 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-left: 3px solid #38bdf8; padding: 12px 14px; border-radius: 12px; font-size: 12px; color: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 25px rgba(0,0,0,0.6); z-index: 100; width: 200px; line-height: 1.4; opacity: 0; transition: opacity 0.3s; pointer-events: none;">
            </div>
        </div>
    `;
}

window.checkMentorIdentity = function() {
    const tooltip = document.getElementById('mentor-identity-tooltip');
    if (!tooltip) return;

    const currentProvider = window.userProfile?.ai_provider || 'groq';
    const providerName = currentProvider.toLowerCase() === 'gemini' ? 'Google Gemini' : 'Groq (Claude / Llama)';

    tooltip.style.borderLeftColor = '#38bdf8';
    tooltip.innerHTML = `
        <b style="color: #38bdf8; display: block; margin-bottom: 4px;">🤖 Ментор на связи:</b>
        Активный ИИ: <b>${providerName}</b>
    `;

    tooltip.style.display = 'block';
    setTimeout(() => tooltip.style.opacity = '1', 10);

    setTimeout(() => {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.style.display = 'none', 300);
    }, 4000);
};