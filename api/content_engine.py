# ==========================================
# ФАЙЛ: api/content_engine.py
# ==========================================
import json
import random
import re
from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "semantic_dictionary.db"


def load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"⚠️ Файл {filename} не найден!")
    return {}


# --- 1. ГЛОБАЛЬНЫЕ БАЗЫ В ПАМЯТИ ---
PATTERNS_DB = load_json("grammar_patterns.json")

MARKERS_DB = {
    "en": load_json("grammar_markers_en.json"),
    "de": load_json("grammar_markers_de.json")
}

VOCAB_DB = {
    "en": load_json("vocab_en.json"),
    "de": load_json("vocab_de.json")
}


# --- 2. ПОИСК СЛОВ ПО ID ЧЕРЕЗ СЕМАНТИЧЕСКИЙ ГРАФ-ФИЛЬТР С ДЕТАЛЬНЫМ ЛОГИРОВАНИЕМ ---

def get_semantically_related_words(target_word: str, lang: str, level: str, pos: str, limit: int = 5) -> list:
    print(f"\n" + "🧩" + "=" * 50)
    print(f"🧩 [SEMANTIC GRAPH TRACE] Запрос семантического фильтра")
    print(f"   • Целевое слово: '{target_word}'")
    print(f"   • Язык: '{lang}' | Уровень: '{level}' | Часть речи: '{pos}' | Лимит: {limit}")
    print(f"   • Путь к базе графа: {DB_PATH}")

    if not DB_PATH.exists():
        print(f"❌ [SEMANTIC GRAPH ERROR] Файл базы семантического графа не найден по пути: {DB_PATH}")
        return []

    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()

        # 1. Находим концепты (категории), к которым принадлежит целевое слово
        cursor.execute("""
                       SELECT c.id, c.name
                       FROM global_words gw
                                JOIN word_concept_edges wce ON gw.id = wce.word_id
                                JOIN semantic_concepts c ON wce.concept_id = c.id
                       WHERE LOWER(gw.word) = LOWER(?)
                         AND LOWER(gw.lang) = LOWER(?)
                       """, (target_word.strip(), lang))

        concept_rows = cursor.fetchall()
        concept_ids = [row[0] for row in concept_rows]

        print(f"   • Найденные семантические группы (концепты) для слова '{target_word}':")
        if concept_rows:
            for cid, cname in concept_rows:
                print(f"     - ID концепта: {cid} | Название: '{cname}'")
        else:
            print(f"     ⚠️ Для слова '{target_word}' не найдено ни одного концепта в графе!")
            conn.close()
            return []

        # 2. Ищем другие слова из графа с теми же концептами, нужного уровня и части речи
        placeholders = ','.join(['?'] * len(concept_ids))
        query = f"""
            SELECT DISTINCT gw.id, gw.word, gw.cefr_level, gw.pos
            FROM global_words gw
            JOIN word_concept_edges wce ON gw.id = wce.word_id
            WHERE LOWER(gw.lang) = LOWER(?) 
              AND LOWER(gw.pos) = LOWER(?)
              AND UPPER(gw.cefr_level) = UPPER(?)
              AND LOWER(gw.word) != LOWER(?)
              AND wce.concept_id IN ({placeholders})
            ORDER BY RANDOM()
            LIMIT ?
        """

        # 🔥 ИСПРАВЛЕНИЕ: Оставляем pos как есть ('adjectives', 'verbs', 'nouns', 'adverbs'), как в базе
        pos_clean = pos

        params = [lang, pos_clean, level, target_word.strip()] + concept_ids + [limit * 2]
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        print(f"   • Кандидаты, найденные в графе по тем же концепты (pos='{pos_clean}', уровень='{level}'):")
        print(f"     - Всего найдено сырых совпадений: {len(rows)}")
        formatted_rows = [{"id": row[0], "word": row[1], "level": row[2], "pos": row[3]} for row in rows]
        for item in formatted_rows:
            print(
                f"       * ID: {item['id']} | Слово: '{item['word']}' | Уровень: {item['level']} | Позиция: {item['pos']}")

        print("🧩" + "=" * 50 + "\n")
        return [{"id": item["id"], "word": item["word"]} for item in formatted_rows[:limit]]
    except Exception as e:
        print(f"❌ [SEMANTIC GRAPH EXCEPTION] Ошибка запроса к семантическому графу по ID: {e}")
        return []


# --- 3. ЛОГИКА ВЫБОРКИ (СУДЬЯ) ---

def pick_least_used(items: list, stats_dict: dict, count: int = 1):
    """Выбирает элементы, которые использовались реже всего (на основе ID)."""
    if not items:
        return []

    def get_key(item):
        return str(item.get("id", item)) if isinstance(item, dict) else str(item)

    sorted_items = sorted(items, key=lambda i: stats_dict.get(get_key(i), 0))
    min_usage_val = stats_dict.get(get_key(sorted_items[0]), 0)
    min_count_items = [i for i in sorted_items if stats_dict.get(get_key(i), 0) == min_usage_val]

    if len(min_count_items) >= count:
        return random.sample(min_count_items, count)
    else:
        return sorted_items[:count]


def build_background_vocab(user_level: str, pattern_mix: dict, lang: str, bg_stats: dict,
                           target_word: str = None) -> list:
    """Собирает фоновый набор слов, используя семантический граф как фильтр по ID с детальным логированием."""
    background_objs = []
    lang_vocab = VOCAB_DB.get(lang, {})

    clean_level = str(user_level).strip().upper().replace("+", "")
    level_dict = lang_vocab.get(clean_level, {})

    print(f"\n" + "📊" + "=" * 60)
    print(f"📊 [BACKGROUND VOCAB BUILDER] Детальный анализ сборки фона")
    print(f"   • Целевое слово: '{target_word}'")
    print(f"   • Уровень пользователя (исходный): '{user_level}' -> (нормализованный): '{clean_level}'")
    print(f"   • Язык: '{lang}'")
    print(f"   • Запрошенный паттерн микса частей речи: {pattern_mix}")
    print(
        f"   • Словарь уровня {clean_level} содержит ключи частей речи: {list(level_dict.keys()) if level_dict else 'ПУСТО'}")

    for part_of_speech, required_count in pattern_mix.items():
        print(f"\n   --------------------------------------------------")
        print(f"   📌 Обработка части речи: '{part_of_speech}' | Требуется отобрать: {required_count}")
        if required_count <= 0:
            print(f"      ➔ Пропуск (требуемое количество 0)")
            continue

        selected = []

        # Шаг 1: Используем семантический граф как фильтр для получения ID подходящих слов
        if target_word:
            print(f"      🔍 Шаг 1: Запрос семантического фильтра из графа для части речи '{part_of_speech}'...")
            related_words = get_semantically_related_words(target_word, lang, clean_level, part_of_speech,
                                                           limit=required_count * 3)
            if related_words:
                print(
                    f"         ➔ Граф вернул {len(related_words)} кандидатов. Применяем критерий наименьшей используемости (pick_least_used)...")
                selected = pick_least_used(related_words, bg_stats, min(required_count, len(related_words)))
                print(f"         ➔ Успешно отобрано из графа: {len(selected)} слов(а): {[w['word'] for w in selected]}")
            else:
                print(
                    f"         ⚠️ Граф не вернул подходящих слов для части речи '{part_of_speech}'. Переходим к фолбэку.")

        # Шаг 2: Фолбэк на основной словарь при нехватке
        if len(selected) < required_count:
            needed = required_count - len(selected)
            print(f"      🔍 Шаг 2: Фолбэк на основной словарь `vocab_{lang}.json` (не хватает еще {needed} слов)...")
            available_words = level_dict.get(part_of_speech, [])
            print(
                f"         ➔ Всего доступно в словаре для уровня {clean_level} / {part_of_speech}: {len(available_words)} слов")

            selected_ids = {str(w.get("id", w)) if isinstance(w, dict) else str(w) for w in selected}
            filtered_available = [w for w in available_words if
                                  (str(w.get("id", w)) if isinstance(w, dict) else str(w)) not in selected_ids]
            print(f"         ➔ Доступно после исключения уже выбранных: {len(filtered_available)} слов")

            if filtered_available:
                fallback_selected = pick_least_used(filtered_available, bg_stats, min(needed, len(filtered_available)))
                selected.extend(fallback_selected)
                print(
                    f"         ➔ Отобрано из основного словаря (фолбэк): {len(fallback_selected)} слов(а): {[w.get('word', w) if isinstance(w, dict) else w for w in fallback_selected]}")
            else:
                print(f"         ❌ Внимание: в словаре не осталось доступных слов для части речи '{part_of_speech}'!")

        print(f"      ✅ Итого отобрано для '{part_of_speech}': {len(selected)} из {required_count} требуемых.")
        background_objs.extend(selected)

    print(f"\n📊 [BACKGROUND VOCAB BUILDER] Итог сбора фона:")
    print(f"   • Всего собрано объектов фоновых слов: {len(background_objs)}")
    print("📊" + "=" * 60 + "\n")
    return background_objs


def generate_task_payload(target_word: str, rule_name: str, rule_pattern_tag: str, user_level: str, lang: str,
                          marker_stats: dict = None, bg_stats: dict = None) -> dict:
    if marker_stats is None: marker_stats = {}
    if bg_stats is None: bg_stats = {}

    print(f"\n" + "🔥" * 35)
    print(f"🚀 [GENERATE_TASK_PAYLOAD] СТАРТ ФОРМИРОВАНИЯ ЗАДАНИЯ")
    print(f"📚 ГРАММАТИЧЕСКОЕ ПРАВИЛО: >>> '{rule_name}' <<<")
    print(f"🎯 ЦЕЛЕВОЕ СЛОВО: '{target_word}'")
    print(f"   • Тег паттерна: '{rule_pattern_tag}' | Уровень: '{user_level}' | Язык: '{lang}'")
    print("🔥" * 35)

    rule_lower = rule_name.lower()
    pattern_mix = {}

    if "adjective" in rule_lower or "comparative" in rule_lower or "superlative" in rule_lower:
        pattern_mix = {"adjectives": 3, "nouns": 1, "verbs": 1, "adverbs": 0}
        print(f"💡 [Auto-Pattern] Сработал авто-паттерн для прилагательных -> {pattern_mix}")
    elif "noun" in rule_lower or "article" in rule_lower or "plural" in rule_lower:
        pattern_mix = {"adjectives": 1, "nouns": 3, "verbs": 1, "adverbs": 0}
        print(f"💡 [Auto-Pattern] Сработал авто-паттерн для существительных -> {pattern_mix}")
    elif "verb" in rule_lower or "tense" in rule_lower or "past" in rule_lower or "present" in rule_lower or "future" in rule_lower:
        pattern_mix = {"adjectives": 1, "nouns": 1, "verbs": 2, "adverbs": 1}
        print(f"💡 [Auto-Pattern] Сработал авто-паттерн для глаголов/времен -> {pattern_mix}")
    else:
        pattern_config = PATTERNS_DB.get(rule_pattern_tag, PATTERNS_DB.get("default_mix"))
        pattern_mix = pattern_config.get("mix", {}) if isinstance(pattern_config, dict) else {"verbs": 1, "nouns": 2,
                                                                                              "adjectives": 1}
        print(f"💡 [Auto-Pattern] Использован стандартный паттерн из PATTERNS_DB -> {pattern_mix}")

    lang_markers = MARKERS_DB.get(lang, {})
    marker_config = lang_markers.get(rule_name)

    mandatory_marker = None
    if isinstance(marker_config, dict):
        available_markers = marker_config.get("markers", [])
        print(f"🎯 Доступные маркеры для правила '{rule_name}': {available_markers}")
        if available_markers:
            mandatory_marker = pick_least_used(available_markers, marker_stats, 1)[0]
            print(f"🎯 Выбран обязательный маркер (на основе наименьшей используемости): '{mandatory_marker}'")
        else:
            print(f"⚠️ У правила нет списка маркеров в `grammar_markers_{lang}.json`")
    else:
        print(f"⚠️ Правило '{rule_name}' не найдено в конфигурации маркеров для языка '{lang}'")

    # Получаем объекты слов с их ID через семантический фильтр
    background_objs = build_background_vocab(user_level, pattern_mix, lang, bg_stats, target_word=target_word)

    res_words = [w["word"] if isinstance(w, dict) else w for w in background_objs]
    used_ids = [w.get("id", 0) if isinstance(w, dict) else 0 for w in background_objs]

    print(f"\n📦 [PAYLOAD FINAL SUMMARY]")
    print(f"   • Финальные фоновые слова (текст): {res_words}")
    print(f"   • Финальные фоновые слова (ID для трекинга в БД): {used_ids}")
    print(f"   • Обязательный маркер: {mandatory_marker}")
    print("=" * 70 + "\n")

    return {
        "target_word": target_word,
        "rule_name": rule_name,
        "mandatory_marker": mandatory_marker,
        "background_words": res_words,
        "used_background_ids": used_ids
    }


def check_word_level_and_fallback(target_word: str, user_level: str, lang: str) -> dict:
    lang_vocab = VOCAB_DB.get(lang, {})

    clean_word = target_word.split('«')[-1].split('»')[0].strip().lower()
    if not clean_word:
        clean_word = target_word.strip().lower()

    if lang == "de":
        is_gibberish = not bool(re.match(r'^[a-zäöüß\s\-]+$', clean_word))
    else:
        is_gibberish = not bool(re.match(r'^[a-z\s\-]+$', clean_word))

    user_level_upper = user_level.strip().upper().replace("А", "A")
    user_level_dict = lang_vocab.get(user_level_upper, {})

    if is_gibberish:
        available_words = user_level_dict.get("verbs", []) + user_level_dict.get("nouns", []) + user_level_dict.get(
            "adjectives", [])
        if available_words:
            chosen = random.choice(available_words)
            fallback_word = chosen["word"] if isinstance(chosen, dict) else chosen
        else:
            fallback_word = "server"

        warning_text = (
            f"❌ Слово <b>«{clean_word}»</b> введено некорректно. "
            f"Вместо него выбрано: <b>«{fallback_word}»</b>."
        )
        return {"is_appropriate": False, "word": fallback_word, "fallback_word": fallback_word, "message": warning_text}

    word_in_any_level = False
    actual_found_level = None

    for lvl_name, level_dict in lang_vocab.items():
        if not isinstance(level_dict, dict): continue
        for pos, words_list in level_dict.items():
            if not isinstance(words_list, list): continue

            valid_words = [(w["word"].lower() if isinstance(w, dict) else str(w).lower()) for w in words_list]
            if clean_word in valid_words:
                word_in_any_level = True
                actual_found_level = lvl_name
                break
        if word_in_any_level:
            break

    if word_in_any_level:
        warning_msg = None
        if actual_found_level != user_level_upper:
            warning_msg = f"⚠️ Слово <b>«{clean_word}»</b> относится к уровню <b>{actual_found_level}</b>. Предложение будет сложнее!"
        return {"is_appropriate": True, "word": clean_word, "fallback_word": clean_word, "message": warning_msg}

    return {"is_appropriate": True, "word": clean_word, "fallback_word": clean_word,
            "message": f"💡 Слово <b>«{clean_word}»</b> не из базы, но распознано."}