# ==========================================
# ФАЙЛ: main.py (или твой основной файл запуска)
# ==========================================
import telebot
from dotenv import load_dotenv
load_dotenv()
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
import utils  # 👈 Импортируем utils



# 🔥 Текст справки и инструкции
HELP_TEXT = (

    "С мной можно общаться как с обычным ИИ, а также использовать для изучения языков и быстрой озвучки с переводом\n\n"
    "⚡ Выберите режим:\n"
    "• Чат\n"
    "• Обучение\n"
    "• Произношение..\n"
    "чтобы узнать подробнее.\n\n"
    "Либо откройте приложение и начните тренировки."

)




# ОБРАБОТКА КОМАНДЫ /start В TELEGRAM
# ==========================================
@bot.message_handler(commands=['start'])
def send_welcome(message):

    chat_id = message.chat.id
    live_chat_database.set_user_mode(chat_id, "CHAT")

    # 🔥 АВТОМАТИЧЕСКИЙ ЗАПУСК ТАЙМЕРА
    utils.start_or_resume_timer(message.chat.id)

    web_app_url = "https://mentorapp.duckdns.org/"

    # Создаем инлайн-клавиатуру
    markup = InlineKeyboardMarkup(row_width=1)

    btn_app = InlineKeyboardButton(text="🚀 Открыть приложение", web_app=WebAppInfo(url=web_app_url))
    markup.add( btn_app)


    # 1. Отправляем приветствие с НИЖНЕЙ клавиатурой (Режимы)
    bot.send_message(
        message.chat.id,
        "Привет! 👋 Я твой ИИ-Ментор",
        reply_markup=handlers.buttons.get_chat_mode_keyboard() # 👈 Цепляем ту самую клавиатуру
    )

    # 2. Отправляем инструкцию с ИНЛАЙН-кнопками
    bot.send_message(
        message.chat.id,
        f"{HELP_TEXT}\n\n",
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