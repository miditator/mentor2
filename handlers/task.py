# handlers/task.py
from telebot import types
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import aiPrompts
from loader import bot
from ai_service import ask_ai
import utils
from utils import send_text_task
import database
from . import buttons

def get_inline_main_menu():
    """Две базовые кнопки после успешного перевода"""
    markup = InlineKeyboardMarkup(row_width=1)
    markup.add(
        InlineKeyboardButton(text="🎯 Новое задание", callback_data="generate_new_task"),
        InlineKeyboardButton(text="🚀 Открыть приложение", web_app=WebAppInfo(url="https://mentorapp.duckdns.org/"))
    )
    return markup

# Игнорируем команды со слэшем (например /start)
@bot.message_handler(func=lambda message: message.text and not message.text.startswith('/') and database.get_active_task(message.chat.id) is not None)
def check_english_translation(message):
    chat_id = message.chat.id
    user_answer = message.text.strip()

    task_data = database.get_active_task(chat_id)
    if not task_data:
        return

    original_ru_phrase = task_data["phrase"]
    user_config = database.get_user_config(chat_id)

    prompt_text = aiPrompts.answer_prompt(original_ru_phrase, user_answer, user_config)
    bot.send_message(chat_id, "🔍 <b>Проверяю твою грамматику...</b>", parse_mode="HTML")

    try:
        ai_text = ask_ai(prompt_text, temperature=0.5)

        # Выводим вердикт ИИ
        bot.send_message(chat_id, ai_text, reply_markup=types.ReplyKeyboardRemove(), parse_mode="HTML")
        database.delete_active_task(chat_id)

        # Выкатываем кнопки для продолжения
        bot.send_message(chat_id, "Задание выполнено! Выбери следующее действие:", reply_markup=get_inline_main_menu(), parse_mode="HTML")

    except Exception as e:
        bot.reply_to(message, f"Ошибка ИИ: {e}")