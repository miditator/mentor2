# start.py
from loader import bot
import utils
import database
import keyboard
from telebot import types
from utils import send_text_task


# start.py
from loader import bot
import keyboard
import database
import utils
from telebot import types

@bot.message_handler(commands=['start'])
def StartMentor(message):
    chat_id = message.chat.id

    # 1. Молча создаем запись в БД для новых пользователей
    # (если пользователь уже есть, эта функция внутри БД обычно просто ничего не делает)
    database.create_empty_user(chat_id)

    # 2. Запускаем или возобновляем фоновый таймер отправки фраз
    utils.start_or_resume_timer(chat_id)

    # 3. Принудительно удаляем старую текстовую клавиатуру (если осталась)
    bot.send_message(
        chat_id,
        "🔄 Настраиваем профиль...",
        reply_markup=types.ReplyKeyboardRemove()
    )

    # 4. Отправляем приветствие с кнопкой Web App
    bot.send_message(
        chat_id,
        "👋 <b>Добро пожаловать в ИИ-Ментор!</b>\n\n"
        "Теперь всё обучение, словари и настройки находятся внутри удобного приложения.\n"
        "А сюда я буду регулярно присылать новые задания по твоему таймеру! ⏳\n\n"
        "Жми на кнопку ниже, чтобы открыть профиль 👇",
        reply_markup=keyboard.get_app_menu(),
        parse_mode="HTML"
    )