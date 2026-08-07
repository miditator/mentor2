from fastapi import APIRouter
import ai_service
import os
from gtts import gTTS
import io
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api", tags=["Media_connection"])



@router.post("/speech/recognize")
async def recognize_speech(chat_id: int, file: UploadFile = File(...)):
    temp_path = f"temp_audio_{chat_id}.ogg"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())
    try:
        text = ai_service.transcribe_audio_ai(temp_path)
        return {"success": True, "text": text}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/speech/tts")
def text_to_speech(text: str, lang: str = "en"):
    try:
        tts = gTTS(text=text, lang=lang)
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)
        return StreamingResponse(audio_io, media_type="audio/mpeg")
    except Exception as e:
        return {"success": False, "error": str(e)}