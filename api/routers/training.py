from fastapi import APIRouter
import database

from api.schemas import *

router = APIRouter(prefix="/api", tags=["Training"])

@router.get("/train/start")
def start_training(chat_id: int, count: int = 5):
    try:
        words = database.get_words_for_training(chat_id, limit_new=count)
        result = [{"id": w[0], "foreign": w[1], "ru": w[2], "score": w[3]} for w in words]
        return {"success": True, "words": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/train/check")
def check_training_answer(data: TrainingAnswerData):
    try:
        database.update_word_progress(data.word_id, data.is_correct)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/train/finish")
def finish_training_session(data: TrainFinishData):
    try:
        database.add_word_completions(data.chat_id, data.count)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}