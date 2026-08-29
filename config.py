from dotenv import load_dotenv
import os

load_dotenv()



# Ключи и токены
GEMINI_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
TOKEN = os.getenv("TOKEN")
TASK_INTERVAL = 7200

# Второстепенные модели (если нужны точечно для задач вроде аудио или зрения)
VISION_MODEL = "gemini-3.5-flash-lite"
ANALYZE_AUDIO_MODEL = "gemini-3.5-flash-lite"
AUDIO_MODEL = "whisper-large-v3"
LIVE_CHAT_MODEL = "gemini-3.5-flash-lite" # Можно использовать gemini-2.5-pro, если нужен более глубокий анализ
ROUTER_MODEL = "gemini-3.5-flash-lite"
temperature = 0.5

# 🔥 ЕДИНЫЙ ПУЛЬТ УПРАВЛЕНИЯ ПРОВАЙДЕРАМИ
ACTIVE_LLM_PROVIDER = "gemini"  # "gemini", "groq" или "openai"

LLM_PROVIDERS = {
    "gemini": {
        "api_key": GEMINI_KEY,
        "models": "gemini-3.5-flash-lite",  # Обновил до твоей актуальной модели
        "type": "gemini"
    },
    "groq": {
        "api_key": GROQ_KEY,
        "base_url": "https://api.groq.com/openai/v1",
        "models": "llama-3.3-70b-versatile",
        "type": "openai"
    },
    "oss_120b": {
        "api_key": GROQ_KEY,
        "base_url": "https://api.groq.com/openai/v1",
        "models": "openai/gpt-oss-120b",
        "type": "openai"
    },
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY", "sk-proj-твой-ключ"),
        "base_url": None,
        "models": "gpt-4o-mini",
        "type": "openai"
    }
}

# 🛡️ АВТОМАТИЧЕСКИЕ ВИРТУАЛЬНЫЕ ПЕРЕМЕННЫЕ (защита от багов)
# Теперь кодовая база может обращаться к config.MODEL или config.API_KEY,
# и они всегда будут соответствовать выбранному ACTIVE_LLM_PROVIDER.
active_provider_config = LLM_PROVIDERS[ACTIVE_LLM_PROVIDER]

MODEL = active_provider_config["models"]
API_KEY = active_provider_config["api_key"]
API_TYPE = active_provider_config["type"]
BASE_URL = active_provider_config.get("base_url")

print("========================================")
print(f"📝 ЛОГ CONFIG: GEMINI_KEY загружен? -> {bool(GEMINI_KEY)}")
if GEMINI_KEY:
    print(f"📝 ЛОГ CONFIG: Первые символы ключа: {GEMINI_KEY[:10]}...")
print("========================================")