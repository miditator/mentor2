import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

import config
import database
from loader import bot
import handlers
import handlers.buttons
import handlers.words
import handlers.intensity


# ==========================================
# ОБРАБОТКА КОМАНДЫ /start В TELEGRAM
# ==========================================
@bot.message_handler(commands=['start'])
def send_welcome(message):
    web_app_url = "https://mentorapp.duckdns.org/"

    # Создаем клавиатуру с шириной в 1 столбец, чтобы кнопки были друг под другом
    markup = InlineKeyboardMarkup(row_width=1)

    # Создаем ДВЕ кнопки
    btn_task = InlineKeyboardButton(text="🎯 Новое задание", callback_data="generate_new_task")
    btn_app = InlineKeyboardButton(text="🚀 Открыть приложение", web_app=WebAppInfo(url=web_app_url))

    # Добавляем обе кнопки в меню
    markup.add(btn_task, btn_app)

    # Отправляем сообщение в чат
    bot.send_message(
        message.chat.id,
        "Привет! 👋\n\nЯ твой ИИ-Ментор. Выбери действие ниже, чтобы продолжить:",
        reply_markup=markup
    )

if __name__ == "__main__":
    bot.add_custom_filter(telebot.custom_filters.StateFilter(bot))
    print("🚀 Архитектурный ИИ-Ментор успешно запущен!")
    bot.infinity_polling()