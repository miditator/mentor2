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

# ❌ СТАРАЯ ФУНКЦИЯ ПРОВЕРКИ ПЕРЕВОДА ОТКЛЮЧЕНА И БОЛЬШЕ НЕ МЕШАЕТ ТЕКСТУ
# @bot.message_handler(func=lambda message: message.text and not message.text.startswith('/') and database.get_active_task(message.chat.id) is not None)
# def check_english_translation(message):
#     pass