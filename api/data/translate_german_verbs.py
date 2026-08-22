import json
import os
import time
from openai import OpenAI

import config

# Твои данные конфигурации
GROQ_KEY = os.getenv("GROQ_API_KEY", config.GROQ_KEY)  # Или подставь ключ напрямую, если нужно
BASE_URL = "https://api.groq.com/openai/v1"
MODEL_NAME = "openai/gpt-oss-120b"

# Инициализируем клиент
client = OpenAI(
    api_key=GROQ_KEY,
    base_url=BASE_URL
)

JSON_FILE = "german_phrasal_verbs.json"  # Исходный файл
OUTPUT_FILE = "german_phrasal_verbs_ru.json"  # Файл с результатами


def ask_groq_batch(prompt: str) -> str:
    """Запрос к Groq API для пакетной обработки"""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional translator. Translate the English values in the provided JSON into clean, natural Russian. Return ONLY a valid JSON object mapping the same keys to their Russian translations. No markdown formatting, no explanations, just raw JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f" ❌ Ошибка API Groq: {e}")
        return ""


def translate_german_verbs_in_batches():
    if not os.path.exists(JSON_FILE):
        print(f"❌ Файл {JSON_FILE} не найден!")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Подтягиваем прогресс, если он уже есть
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            updated_data = json.load(f)
        print(f"🔄 Найден файл прогресса '{OUTPUT_FILE}'. Продолжаем...")
    else:
        updated_data = data.copy()

    # Собираем список элементов, которые еще не переведены (содержат латиницу в текущем переводе)
    untranslated = []
    for verb, info in updated_data.items():
        translations = info.get("translations", {})
        ru_dict = translations.get("ru", {})
        if ru_dict:
            eng_text = list(ru_dict.keys())[0]
            if any(c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" for c in eng_text):
                untranslated.append((verb, eng_text))

    total_left = len(untranslated)
    print(q := f"📌 Осталось перевести глаголов: {total_left}")

    if total_left == 0:
        print("✅ Всё уже переведено!")
        return

    # Разбиваем на пачки по 20 штук
    batch_size = 20
    batches = [untranslated[i:i + batch_size] for i in range(0, total_left, batch_size)]

    for batch_idx, batch in enumerate(batches, 1):
        print(f"\n📦 Отправляем пачку {batch_idx} из {len(batches)} (элементов: {len(batch)})...")

        # Формируем словарь для отправки модели
        batch_payload = {verb: eng for verb, eng in batch}
        prompt = json.dumps(batch_payload, ensure_ascii=False)

        response_text = ask_groq_batch(prompt)

        if response_text:
            try:
                # Очищаем от возможных markdown-оберток вроде ```json ... ```
                cleaned_response = response_text.replace("```json", "").replace("```", "").strip()
                translated_batch = json.loads(cleaned_response)

                # Обновляем данные
                for verb, rus_translation in translated_batch.items():
                    if verb in updated_data and rus_translation:
                        clean_rus = str(rus_translation).strip().replace('"', '')
                        updated_data[verb]["translations"]["ru"] = {
                            clean_rus: []
                        }
                        print(f"   ✔ {verb} ➡️ {clean_rus}")

                # Сохраняем прогресс после каждой успешной пачки
                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(updated_data, f, ensure_ascii=False, indent=4)
                print(f"💾 Пачка {batch_idx} успешно сохранена в файл!")

            except json.JSONDecodeError as je:
                print(f" ❌ Ошибка парсинга JSON ответа модели: {je}")
                print(f"Ответ был:\n{response_text}")

        # Пауза между пачками, чтобы не долбить лимиты API
        print("⏳ Пауза 5 секунд перед следующей пачкой...")
        time.sleep(5)

    print(f"\n✅ Перевод всех пачек завершен! Итоговый файл: {OUTPUT_FILE}")


if __name__ == "__main__":
    translate_german_verbs_in_batches()