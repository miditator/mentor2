import telebot
from google import genai
from groq import Groq
from telebot.storage import StateMemoryStorage
import config
import google.generativeai as genai

state_storage = StateMemoryStorage()

# Инициализируем бота и ИИ, используя данные из config.py
bot = telebot.TeleBot(config.TOKEN, state_storage=state_storage)
ai_client = Groq(api_key=config.GROQ_KEY)

ai_audio = config.AUDIO_MODEL


genai.configure(api_key=config.GEMINI_KEY)
vision_model = genai.GenerativeModel(config.VISION_MODEL)