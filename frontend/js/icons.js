

    // ==========================================
// ФАЙЛ: frontend/js/icons.js
// ==========================================

const APP_ICONS = {
    //  Иконка Интенсива (График)
    intensity: `
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 26H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M6 22L12 15L18 19L26 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 8H26V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `,

    //  Иконка тренировки(часики)
    training:`
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="13" fill="rgba(245, 158, 11, 0.04)" stroke="rgba(251, 191, 36, 0.6)" stroke-width="1.4"/>
                <path d="M16 10V16H20" stroke="rgba(254, 243, 199, 0.8)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 13.5C7 9.35786 10.3579 6 14.5 6C16.8 6 18.9 7.0 20.4 8.6" stroke="rgba(251, 191, 36, 0.7)" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M19 5L20.5 8.5L17 9" fill="rgba(251, 191, 36, 0.7)" stroke="rgba(251, 191, 36, 0.7)" stroke-width="0.8" stroke-linejoin="round"/>
            </svg>
    `,

    // 📚 Иконка Словаря
    dictionary: `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
        </svg>
    `,

    // 👇 Стрелочка вниз (для разворачивания карточки)
    chevronDown: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
        </svg>
    `,

    // ✕ Крестик закрытия
    close: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `,

    // 🖼️ Новая иконка карточки (из вашего примера)
    cardCustom: `
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="24" height="20" rx="3" fill="rgba(59, 130, 246, 0.08)" stroke="#60a5fa" stroke-width="1.4"/>
            <path d="M4 22L10 16L15 21L21 14L28 21" stroke="#60a5fa" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="21" cy="11" r="2" fill="#60a5fa" fill-opacity="0.8"/>
        </svg>
    `,

// ⬅️ Стрелочка влево (Назад)
    chevronLeft: `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,

    // ✏️ Иконка карандаша (редактирование)
    pencil: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
    `,

};




/**
 * Вспомогательная функция для кастомизации размера/цвета при необходимости
 */
function getIcon(name, customStyle = "") {
    if (!APP_ICONS[name]) return "";
    if (!customStyle) return APP_ICONS[name];

    // Оборачиваем в span с кастомным стилем (например, другим цветом или размером)
    return `<span style="display: inline-flex; align-items: center; justify-content: center; ${customStyle}">${APP_ICONS[name]}</span>`;


}