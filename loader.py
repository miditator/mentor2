import telebot
from telebot.storage import StateMemoryStorage
import config
from openai import OpenAI

# Инициализируем хранилище состояний и самого бота
state_storage = StateMemoryStorage()
bot = telebot.TeleBot(config.TOKEN, state_storage=state_storage)

# ==========================================
# ИНИЦИАЛИЗАЦИЯ ИИ-ПРОВАЙДЕРОВ (из config.py)
# ==========================================
API_TYPE = config.API_TYPE
CURRENT_MODEL = config.MODEL

ai_client_openai = None

# Инициализируем клиента OpenAI (если он выбран)
if API_TYPE == "openai":
    ai_client_openai = OpenAI(
        api_key=config.API_KEY,
        base_url=config.BASE_URL
    )

# Модель для аудио (использует централизованный ключ Gemini/Groq)
ai_audio = config.AUDIO_MODEL