# keyboards.py
from telebot import types



def get_app_menu():
    """Единственная кнопка для запуска Telegram Mini App"""
    markup = types.InlineKeyboardMarkup(row_width=1)

    # Твоя ссылка на приложение
    web_app_url = f"https://miditator.github.io/mentor2/?v=21"

    app_button = types.InlineKeyboardButton(
        text="🚀 Открыть приложение",
        web_app=types.WebAppInfo(url=web_app_url)
    )
    markup.add(app_button)

    return markup