import sys
from pathlib import Path
import random

# Импортируем наш движок из папки api
try:
    from api.content_engine import generate_task_payload, PATTERNS_DB, MARKERS_DB, VOCAB_DB
except ImportError:
    # Если файл лежит в корне вместе со скриптом проверки
    from content_engine import generate_task_payload, PATTERNS_DB, MARKERS_DB, VOCAB_DB


def run_diagnostics():
    print("🔍 [DIAGNOSTICS] Запуск проверки Content Engine...\n")

    # 1. Проверка целостности баз
    print(f"📦 Паттернов загружено: {len(PATTERNS_DB)}")
    for lang in ["en", "de"]:
        markers_count = len(MARKERS_DB.get(lang, {}))
        vocab_levels = list(VOCAB_DB.get(lang, {}).keys())
        print(f"🌐 Язык '{lang.upper()}':")
        print(f"   - Правил с маркерами: {markers_count}")
        print(f"   - Доступные уровни в словаре: {vocab_levels}")
        if markers_count == 0:
            print(f"   ⚠️ Внимание: Для языка '{lang}' не найдено маркеров! Проверьте имя JSON-файла.")
        if not vocab_levels:
            print(f"   ⚠️ Внимание: Словарь для языка '{lang}' пуст или файл не найден!")
        print()

    # 2. Тестовая генерация Lego-пакета (English)
    print("🧪 Тест сборки пакета для Английского (EN):")
    try:
        payload_en = generate_task_payload(
            target_word="server",
            rule_name="Present perfect: Form and use",
            rule_pattern_tag="experience_template",
            user_level="B1",
            lang="en"
        )
        print("   ✅ Успешно! Результат:", payload_en)
    except Exception as e:
        print("   ❌ Ошибка в EN пайплайне:", e)

    print()

    # 3. Тестовая генерация Lego-пакета (German)
    print("🧪 Тест сборки пакета для Немецкого (DE):")
    try:
        payload_de = generate_task_payload(
            target_word="wichtig",
            rule_name="Modalverben (können, müssen, wollen, dürfen)",
            rule_pattern_tag="action_template",
            user_level="A1",
            lang="de"
        )
        print("   ✅ Успешно! Результат:", payload_de)
    except Exception as e:
        print("   ❌ Ошибка в DE пайплайне:", e)

    print("\n✨ Диагностика завершена!")


if __name__ == "__main__":
    run_diagnostics()


def check_word_level_and_fallback(target_word: str, user_level: str, lang: str) -> dict:
    """
    Проверяет целевое слово по словарю.
    """
    lang_vocab = VOCAB_DB.get(lang, {})

    # Очищаем слово от мусора (если передано с переводом)
    clean_word = target_word.split('«')[-1].split('»')[0].strip().lower()
    if not clean_word:
        clean_word = target_word.strip().lower()

    user_level_upper = user_level.strip().upper().replace("А", "A")
    user_level_dict = lang_vocab.get(user_level_upper, {})

    # 1. Проверяем, есть ли слово СТРОГО на текущем уровне пользователя
    word_on_user_level = False
    for pos, words_list in user_level_dict.items():
        if clean_word in [w.lower() for w in words_list]:
            word_on_user_level = True
            break

    if word_on_user_level:
        return {
            "is_appropriate": True,
            "word": clean_word,
            "fallback_word": clean_word,
            "message": None
        }

    # 2. Проверяем, есть ли слово вообще в словаре (но на другом уровне)
    word_in_any_level = False
    actual_found_level = None
    for lvl_name, level_dict in lang_vocab.items():
        for pos, words_list in level_dict.items():
            if clean_word in [w.lower() for w in words_list]:
                word_in_any_level = True
                actual_found_level = lvl_name
                break
        if word_in_any_level:
            break

    # Подбираем рандомное слово на замену из уровня пользователя
    available_words = user_level_dict.get("verbs", []) + user_level_dict.get("nouns", []) + user_level_dict.get(
        "adjectives", [])
    fallback_word = random.choice(available_words) if available_words else clean_word

    # Если слово ЕСТЬ в словаре, но уровень не совпал — делаем замену
    if word_in_any_level:
        warning_text = (
            f"Слово <b>«{clean_word}»</b> относится к уровню <b>{actual_found_level}</b> и не подходит для текущей тренировки ({user_level_upper}). "
            f"Вместо него для задания случайно выбрано слово из вашего уровня: <b>«{fallback_word}»</b>."
        )
        return {
            "is_appropriate": False,
            "word": fallback_word,
            "fallback_word": fallback_word,
            "message": warning_text
        }

    # 3. Если слова вообще НЕТ в словаре (пользовательское кастомное слово) — оставляем его!
    return {
        "is_appropriate": True,
        "word": clean_word,
        "fallback_word": clean_word,
        "message": f"Слово <b>«{clean_word}»</b> отсутствует в базовом словаре. ИИ сгенерировал задание, используя его напрямую."
    }