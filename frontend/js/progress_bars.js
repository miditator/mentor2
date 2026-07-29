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

    // Очищаем старые инлайн-стили и вешаем наш новый класс
    containerEl.style.cssText = '';
    containerEl.className = 'pb-main-container';

    containerEl.innerHTML = `
        <div class="pb-wrapper">
            <div class="pb-bars-col">
                
                <div class="pb-row">
                    <div class="pb-header">
                        <span class="pb-title">${current.row1}</span>
                        <span class="pb-value">${wordsPercent}%</span>
                    </div>
                    <div class="pb-track">
                        <div class="pb-fill" style="width: ${wordsPercent}%;"></div>
                    </div>
                </div>

                <div class="pb-row">
                    <div class="pb-header">
                        <span class="pb-title">${current.row2}</span>
                        <span class="pb-value">${phrasesPercent}%</span>
                    </div>
                    <div class="pb-track">
                        <div class="pb-fill" style="width: ${phrasesPercent}%;"></div>
                    </div>
                </div>

            </div>
            
            <div class="pb-avatar">
                <img src="${mentorAvatarSrc}" alt="Mentor" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        </div>
    `;
}