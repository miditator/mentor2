from .translator import router as translator_router
from .training import router as training_router
from .tasks import router as tasks_router
from .settings import router as settings_router
from .media import router as media_router
from .intensity import router as intensity_router
from .grammar import router as grammar_router
from .dictionary import router as dictionary_router
from .debug import router as debug_router
from .chat import router as chat_router
from .books import router as books_router
from .users_profile import router as users_router

all_routers = [
    users_router,
    books_router,
    chat_router,
    debug_router,
    dictionary_router,
    grammar_router,
    intensity_router,
    media_router,
    settings_router,
    tasks_router,
    training_router,
    translator_router
]