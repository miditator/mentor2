
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import all_routers
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

# Циклом добавляем все роутеры в приложение
for r in all_routers:
    app.include_router(r)

