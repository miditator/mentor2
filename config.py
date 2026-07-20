from dotenv import load_dotenv
import os

load_dotenv()



# Ключи и токены
GEMINI_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
TOKEN = os.getenv("TOKEN")
TASK_INTERVAL = 7200

# Второстепенные модели (если нужны точечно для задач вроде аудио или зрения)
VISION_MODEL = "gemini-2.5-flash"
AUDIO_MODEL = "whisper-large-v3"
temperature = 0.5

# 🔥 ЕДИНЫЙ ПУЛЬТ УПРАВЛЕНИЯ ПРОВАЙДЕРАМИ
ACTIVE_LLM_PROVIDER = "groq"  # "gemini", "groq" или "openai"

LLM_PROVIDERS = {
    "gemini": {
        "api_key": GEMINI_KEY,
        "model": "gemini-2.5-flash",  # Обновил до твоей актуальной модели
        "type": "gemini"
    },
    "groq": {
        "api_key": GROQ_KEY,
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "type": "openai"
    },
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY", "sk-proj-твой-ключ"),
        "base_url": None,
        "model": "gpt-4o-mini",
        "type": "openai"
    }
}

# 🛡️ АВТОМАТИЧЕСКИЕ ВИРТУАЛЬНЫЕ ПЕРЕМЕННЫЕ (защита от багов)
# Теперь кодовая база может обращаться к config.MODEL или config.API_KEY,
# и они всегда будут соответствовать выбранному ACTIVE_LLM_PROVIDER.
active_provider_config = LLM_PROVIDERS[ACTIVE_LLM_PROVIDER]

MODEL = active_provider_config["model"]
API_KEY = active_provider_config["api_key"]
API_TYPE = active_provider_config["type"]
BASE_URL = active_provider_config.get("base_url")