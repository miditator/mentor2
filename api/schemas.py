from pydantic import BaseModel

from typing import List, Optional

# --- PYDANTIC МОДЕЛИ ВАЛИДАЦИИ ДАННЫХ ---
class OnboardingData(BaseModel):
    chat_id: int
    language: str
    difficulty: str


class TranslateWordData(BaseModel):
    chat_id: int
    foreign: str


class AddWordData(BaseModel):
    chat_id: int
    foreign: str
    ru: str

class TaskHelpData(BaseModel):
    chat_id: int
    original_phrase: str
    step: int
    rule: str = None
    target_word: str = None


class TaskAnswerData(BaseModel):
    chat_id: int
    answer: str
    rule: str = None
    target_word: str = None


class UpdateSettingData(BaseModel):
    chat_id: int
    setting_key: str
    setting_value: str


class IntensityStartData(BaseModel):
    chat_id: int
    word: str
    difficulty: str
    step: int = 0
    meanings: Optional[List[str]] = []


class IntensityCheckData(BaseModel):
    chat_id: int
    original_foreign_phrase: str
    russian_task_phrase: str
    user_answer: str
    rule: str
    target_word: str    


class IntensityHelpData(BaseModel):
    chat_id: int
    original_phrase: str
    reference_phrase: str  # В интенсиве ответ хранится на клиенте
    step: int
    rule: str = None
    target_word: str = None


class ImageWordData(BaseModel):
    chat_id: int
    image: str


class WordItem(BaseModel):
    foreign: str
    ru: str


class AddMultipleWordsData(BaseModel):
    chat_id: int
    words: list[WordItem]


class GrammarCheckData(BaseModel):
    chat_id: int
    original_phrase: str
    answer: str
    rule: str
    target_word: str = None


class GrammarHelpData(BaseModel):
    chat_id: int
    original_phrase: str
    step: int
    rule: str = None
    target_word: str = None


class TrainingAnswerData(BaseModel):
    chat_id: int
    word_id: int
    is_correct: bool
    mode: str = 'new'
    source: str = 'user'   # Источник слова
    foreign: str = ""      # Само слово (чтобы записать в БД, если его там нет)
    ru: str = ""           # Перевод слов

class MarkKnownData(BaseModel):
    chat_id: int
    word_id: int
    word_foreign: str
    source: str

class ChatMessageItem(BaseModel):
    role: str
    content: str


class ChatMessageData(BaseModel):
    chat_id: int
    history: list[ChatMessageItem]


class WordDetailsData(BaseModel):
    chat_id: int
    word: str


class EditWordRequest(BaseModel):
    chat_id: int
    word: str
    new_translation: str


class IntensityFinishData(BaseModel):
    chat_id: int
    word: str
    score: int


class TranslateTextData(BaseModel):
    chat_id: int
    text: str


class DeleteWordData(BaseModel):
    chat_id: int
    word: str


class TrainFinishData(BaseModel):
    chat_id: int
    count: int


class DebugAiData(BaseModel):
    chat_id: int

class ErrorAnalysisData(BaseModel):
    chat_id: int
    message: str

# Схема для каждого отдельного слова
class OxfordWordItem(BaseModel):
    word_id: int
    foreign: str
    ru: str

# Схема для получения списка слов разом
class AddOxfordBatchData(BaseModel):
    chat_id: int
    words: List[OxfordWordItem]