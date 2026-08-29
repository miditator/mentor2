
from fastapi import APIRouter, BackgroundTasks
import database
import ai_service
import time

router = APIRouter(prefix="/api/semantic", tags=["Semantic Map"])

CLUSTER_ICONS = {
    "Общество и Люди": "👤",
    "Тело и Здоровье": "🧬",
    "Дом и Быт": "🏠",
    "Еда и Материалы": "🍏",
    "Работа и Деньги": "💼",
    "Разум и Знания": "🧠",
    "Эмоции и Желания": "🎭",
    "Природа и Места": "🌍",
    "Наука и Технологии": "🚀",
    "Действия и События": "⚡",
    "Время и Измерения": "⏳",
    "Закон и Порядок": "⚖️",
    "Отдых и Культура": "🎨",
    "Абстракция": "🌀"
}


def process_background_classification(chat_id: int, unclassified_words: list):
    """Фоновая задача для разметки новых слов без задержки ответа клиенту."""
    try:
        if not unclassified_words:
            return

        print(f"\n🧠 [BG AI] Фоновый запуск классификации {len(unclassified_words)} слов для chat_id: {chat_id}",
              flush=True)
        # Берем батч, например, до 20 слов за раз
        batch = unclassified_words[:20]
        new_mapping = ai_service.batch_classify_semantic_ai(batch, chat_id)

        if new_mapping:
            database.save_word_clusters_for_map(chat_id, new_mapping)
            print(f"   💾 [BG DB] Успешно сохранено {len(new_mapping)} новых связей в фоне", flush=True)
    except Exception as e:
        print(f"   ❌ [BG AI ERROR] Ошибка в фоне: {e}", flush=True)


@router.get("/map")
def get_semantic_map_data(chat_id: int, background_tasks: BackgroundTasks):
    map_start_time = time.time()
    print(f"\n🌌 [SEMANTIC MAP] Мгновенный запрос карты для chat_id: {chat_id}", flush=True)

    try:
        # 1. Получаем слова из нашей БД
        classified, unclassified = database.get_user_words_for_map(chat_id)

        print(f"   • Уже размечено в БД: {len(classified)} слов", flush=True)
        print(f"   • Требует ИИ-разметки (улетело в фон): {len(unclassified)} слов", flush=True)

        # 2. Если есть неразмеченные слова — запускаем их В ФОНЕ (клиент не ждет ни секунды!)
        if unclassified:
            background_tasks.add_task(process_background_classification, chat_id, unclassified)

        # 3. Мгновенно собираем JSON для фронтенда из того, что уже есть
        clusters_dict = {}
        for item in classified:
            word = item["word"]
            c_name = item["cluster"]

            if c_name not in CLUSTER_ICONS:
                c_name = "Абстракция"

            if c_name not in clusters_dict:
                clusters_dict[c_name] = {"icon": CLUSTER_ICONS[c_name], "words": []}

            if word not in clusters_dict[c_name]["words"]:
                clusters_dict[c_name]["words"].append(word)

        formatted_categories = []
        for name, data in clusters_dict.items():
            formatted_categories.append({
                "id": name.upper().replace(" ", "_"),
                "name": name,
                "icon": data["icon"],
                "count": len(data["words"]),
                "words": data["words"][:25]
            })

        total_time = time.time() - map_start_time
        print(f"   ✅ [SEMANTIC MAP] Мгновенный ответ за {total_time:.4f} сек.", flush=True)

        return {"success": True, "categories": formatted_categories}

    except Exception as e:
        print(f"❌ [SEMANTIC MAP ERROR] {e}", flush=True)
        return {"success": False, "error": str(e), "categories": []}


from api import content_engine


@router.get("/grammar-stats")
def get_grammar_stats(chat_id: int):
    print(f"\n📚 [GRAMMAR STATS] Запрос статистики для chat_id: {chat_id}", flush=True)
    try:
        user_config = database.get_user_config(chat_id) or {}
        target_lang = user_config.get("source_lang", "en")
        difficulty = str(user_config.get("difficulty", "A1")).strip().upper().replace("А", "A")

        all_rules = content_engine.GRAMMAR_RULES_BY_LEVEL.get(target_lang, {}).get(difficulty, [])

        conn = database.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
                       SELECT weakness_topic, progress_rule, error_count
                       FROM user_weaknesses
                       WHERE chat_id = ?
                       """, (chat_id,))
        progress_data = cursor.fetchall()
        conn.close()

        progress_dict = {row[0]: {"progress_rule": row[1] if row[1] is not None else 0, "errors": row[2]} for row in
                         progress_data}

        stats = []
        for rule in all_rules:
            rule_info = progress_dict.get(rule, {"progress_rule": 0, "errors": 0})

            stats.append({
                "rule": rule,
                "progress_rule": rule_info["progress_rule"],
                "errors": rule_info["errors"]
            })

        # Сортируем: сначала те, у которых меньше всего прогресса
        stats.sort(key=lambda x: x["progress_rule"])

        print(f"   ✅ Отдано правил с progress_rule: {len(stats)} (Уровень {difficulty})", flush=True)
        return {"success": True, "rules": stats, "level": difficulty}

    except Exception as e:
        print(f"❌ [GRAMMAR STATS ERROR] {e}", flush=True)
        return {"success": False, "error": str(e), "rules": []}