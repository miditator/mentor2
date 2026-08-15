import sqlite3
import json
import time
from groq import Groq
import config

# ==========================================
# НАСТРОЙКИ
# ==========================================
DB_NAME = "semantic_dictionary.db"
API_KEY = config.GROQ_KEY
BATCH_SIZE = 20
SLEEP_TIME = 5.0
MODEL_NAME = "llama-3.1-8b-instant"

client = Groq(api_key=API_KEY)

CATEGORIES = [
    "PERSON", "OBJECT", "LIVING_BEING", "BODY", "FOOD", "SUBSTANCE",
    "RESOURCE", "MONEY", "WORK", "COMMERCE", "EDUCATION", "INFORMATION",
    "THOUGHT", "EMOTION", "DESIRE", "PERCEPTION", "EVALUATION", "ABSTRACT", "POSSIBILITY",
    "ACTION", "CHANGE", "CAUSE", "STATE", "EVENT",
    "SPACE", "MOVEMENT", "TIME", "QUANTITY", "PHYSICAL_PROPERTIES",
    "NATURE", "WEATHER", "GEOGRAPHY_LOCATION",
    "SOCIETY_RELATIONS", "COMMUNICATION", "ENTERTAINMENT_ARTS", "SPORT_LEISURE", "MYTH_RELIGION",
    "SCIENCE_MATH", "TECHNOLOGY", "BUILDING_ARCHITECTURE", "CREATION",
    "CONFLICT", "LAW", "CRIME_JUSTICE", "SAFETY", "HEALTH",
    "OWNERSHIP", "TRAVEL", "CLOTHING", "HOME"
]

def unblock_english_words():
    """Удаляет английские ID из трекера, чтобы скрипт увидел их как новые"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM processed_words WHERE word_id < 100000")
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted > 0:
        print(f"🔓 Разблокировано {deleted} английских слов для повторной разметки.")

def get_unprocessed_batch():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Берем строго английские слова, которых нет в таблице обработанных
    cursor.execute(f'''
        SELECT id, word, pos 
        FROM global_words 
        WHERE lang = 'en' AND id NOT IN (SELECT word_id FROM processed_words)
        LIMIT {BATCH_SIZE}
    ''')
    batch = cursor.fetchall()
    conn.close()
    return batch

def classify_with_llm(batch):
    words_list = "\n".join([f'ID {w[0]}: "{w[1]}" (POS: {w[2]})' for w in batch])

    system_prompt = f"""You are a strict semantic classifier.
Your task is to classify English words into 1 to 3 MOST relevant categories from the provided list.
CRITICAL RULE: Pay strict attention to the Part of Speech (POS).
You MUST respond ONLY with a valid JSON object where the key is the word ID (as a string) and the value is a list of assigned category strings.
Do not output any markdown formatting. Only raw JSON.

Categories list:
{', '.join(CATEGORIES)}

Example format:
{{
  "82": ["ACTION", "QUANTITY"],
  "473": ["STATE", "ABSTRACT"]
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Classify these words:\n{words_list}"}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"},
            temperature=0.0 # Оставил 0 для строгого JSON
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        if "429" in str(e):
            print("⚠️ Ошибка 429: Лимит запросов.")
            return "RATE_LIMIT"
        print(f"❌ Ошибка API: {e}")
        return None

def save_classifications(classifications):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT id, name FROM semantic_concepts")
    concept_map = {name: cid for cid, name in cursor.fetchall()}

    words_processed = 0
    for word_id_str, assigned_cats in classifications.items():
        try:
            word_id = int(word_id_str)
        except ValueError:
            continue

        for cat in assigned_cats:
            if cat in concept_map:
                cursor.execute('INSERT OR IGNORE INTO word_concept_edges (word_id, concept_id) VALUES (?, ?)',
                               (word_id, concept_map[cat]))

        cursor.execute("INSERT OR IGNORE INTO processed_words (word_id) VALUES (?)", (word_id,))
        words_processed += 1

    conn.commit()
    conn.close()
    return words_processed

def main():
    unblock_english_words() # 🔥 Этот фикс сбросит зависший кэш
    total_processed = 0

    while True:
        batch = get_unprocessed_batch()
        if not batch:
            print("🎉 Все английские слова успешно размечены!")
            break

        print(f"⏳ Отправка {len(batch)} слов...")
        classifications = classify_with_llm(batch)

        if classifications == "RATE_LIMIT":
            print("⏸️ Ждем 10 минут (600 секунд) перед возобновлением...")
            time.sleep(600)
            continue
        elif classifications:
            saved_count = save_classifications(classifications)
            total_processed += saved_count
            print(f"✅ Успешно! Размечено: {saved_count}. Всего за сессию: {total_processed}")
        else:
            time.sleep(10)
            continue

        time.sleep(SLEEP_TIME)

if __name__ == "__main__":
    main()