
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.profile import router as profile_router # Импортируем наш роутер
import database


app = FastAPI(title="ИИ-Ментор API")

database.init_db()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚀 ПОДКЛЮЧАЕМ НАШИ РОУТЕРЫ
app.include_router(profile_router)

