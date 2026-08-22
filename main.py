# ==========================================
# ФАЙЛ: main.py (или твой основной файл запуска)
# ==========================================
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

import config
import live_chat_database
import database
from loader import bot
import handlers
import handlers.buttons
import handlers.words
import handlers.intensity
import handlers.chat


# 🔥 Текст справки и инструкции
HELP_TEXT = (
    "🤖 <b>Инструкция по использованию бота:</b>\n\n"
    "С этим ботом можно общаться как с обычным искусственным интеллектом, а также использовать его для изучения языков и быстрой озвучки:\n\n"
    "• 💬 <b>Свободное общение с ИИ:</b> Общайтесь на любые темы, задавайте вопросы, обсуждайте идеи.\n"
    "• 🎙️ <b>Голосовые сообщения:</b>\n"
   "• 🎙️ <b>Проверка произношения и грамматики:</b> просто надиктуйте голосовое сообщение на иностранном языке, и ИИ разберет его.\n"
    "• 🔊 <b>Озвучка фразы:</b> чтобы получить аудио на иностранном языке (например, кому-то переслать), попросите ИИ голосом: <i>«Озвучь мне фразу...»</i>.\n"
    "• ⚡ <b>Озвучка текста:</b> поставьте восклицательный знак в начале сообщения (например, <code>! Привет, как дела?</code>), чтобы бот перевел и озвучил написанный текст.\n\n"
    "💡 Вы всегда можете посмотреть эту справку, отправив команду /help."
)


# ==========================================
# ОБРАБОТКА КОМАНДЫ /start В TELEGRAM
# ==========================================
@bot.message_handler(commands=['start'])
def send_welcome(message):
    web_app_url = "https://mentorapp.duckdns.org/"

    # Создаем клавиатуру с шириной в 1 столбец
    markup = InlineKeyboardMarkup(row_width=1)

    btn_task = InlineKeyboardButton(text="🎯 Новое задание", callback_data="generate_new_task")
    btn_app = InlineKeyboardButton(text="🚀 Открыть приложение", web_app=WebAppInfo(url=web_app_url))

    markup.add(btn_task, btn_app)

    # Приветствие + Инструкция
    welcome_text = (
        "Привет! 👋 Я твой ИИ-Ментор.\n\n"
        f"{HELP_TEXT}\n\n"
        "<b>Выбери действие ниже, чтобы продолжить:</b>"
    )

    bot.send_message(
        message.chat.id,
        welcome_text,
        reply_markup=markup,
        parse_mode="HTML"
    )


# ==========================================
# ОБРАБОТКА КОМАНДЫ /help В TELEGRAM
# ==========================================
@bot.message_handler(commands=['help'])
def send_help(message):
    bot.send_message(
        message.chat.id,
        HELP_TEXT,
        parse_mode="HTML"
    )
    
@bot.message_handler(commands=['plan'])
def test_morning_plan(message):
    import utils
    bot.send_message(message.chat.id, "⏳ Генерирую план (тестовый запуск)...")
    utils.send_morning_plan(message.chat.id)

if __name__ == "__main__":
    database.init_db()
    live_chat_database.init_live_chat_db()  # База памяти ai_memory.db
    bot.add_custom_filter(telebot.custom_filters.StateFilter(bot))
    print("🚀 Архитектурный ИИ-Ментор успешно запущен!")
    bot.infinity_polling()