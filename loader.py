import telebot
from telebot.storage import StateMemoryStorage
import config
import google.generativeai as genai
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
ai_client_gemini = None

# Инициализируем нужного клиента в зависимости от ACTIVE_LLM_PROVIDER
if API_TYPE == "openai":
    ai_client_openai = OpenAI(
        api_key=config.API_KEY,
        base_url=config.BASE_URL
    )
elif API_TYPE == "gemini":
    genai.configure(api_key=config.API_KEY)
    ai_client_gemini = genai.GenerativeModel(CURRENT_MODEL)

# Второстепенные модели для аудио и зрения (используют централизованный ключ Gemini)
ai_audio = config.AUDIO_MODEL

# Для работы vision_model конфигурируем genai с тем же активным ключом Gemini
genai.configure(api_key=config.GEMINI_KEY)
vision_model = genai.GenerativeModel(config.VISION_MODEL)