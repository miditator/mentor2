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

# Укажи имя своего файла с английскими фразовыми глаголами
JSON_FILE = "phrasal.verbs.build.json"  # Твой исходный файл
OUTPUT_FILE = "phrasal_verbs_ru.json"  # Результат


def has_cyrillic(text: str) -> bool:
    """Проверяет наличие кириллицы в строке"""
    return any(c in "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" for c in text)


def has_valid_translation(info: dict) -> bool:
    """Проверяет, есть ли реально заполненный блок translations с кириллицей"""
    translations = info.get("translations")
    if not translations or not isinstance(translations, dict):
        return False

    for level_key, level_val in translations.items():
        if isinstance(level_val, dict):
            for ru_word in level_val.keys():
                if has_cyrillic(str(ru_word)):
                    return True
    return False


def ask_groq_batch(prompt: str) -> str:
    """Запрос к Groq API для пакетного перевода"""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional lexicographer and translator. Translate the given English phrasal verbs/meanings into clean, natural Russian. Return ONLY a valid JSON object mapping the exact phrasal verb keys to their primary Russian translation string. No markdown formatting, no explanations, just raw JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2500
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f" ❌ Ошибка API Groq: {e}")
        return ""


def translate_missing_translations():
    if not os.path.exists(JSON_FILE):
        print(f"❌ Файл {JSON_FILE} не найден!")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Если уже есть файл прогресса, работаем с ним, чтобы не потерять уже переведенное
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            updated_data = json.load(f)
        print(f"🔄 Найден файл прогресса '{OUTPUT_FILE}'. Продолжаем...")
    else:
        updated_data = data.copy()

    # Собираем глаголы, у которых ПОЛНОСТЬЮ отсутствует валидный блок translations
    untranslated = []
    for verb, info in updated_data.items():
        if not has_valid_translation(info):
            # Берем описание для контекста модели
            desc_list = info.get("descriptions", [])
            desc = desc_list[0] if desc_list else "phrasal verb"
            untranslated.append((verb, desc))

    total_left = len(untranslated)
    print(f"📌 Найдено глаголов без блока переводов: {total_left}")

    if total_left == 0:
        print("✅ Во всех глаголах уже есть переводы!")
        return

    batch_size = 20
    batches = [untranslated[i:i + batch_size] for i in range(0, total_left, batch_size)]

    for batch_idx, batch in enumerate(batches, 1):
        print(f"\n📦 Отправляем пачку {batch_idx} из {len(batches)} (элементов: {len(batch)})...")

        batch_payload = {verb: desc for verb, desc in batch}
        prompt = json.dumps(batch_payload, ensure_ascii=False)

        response_text = ask_groq_batch(prompt)

        if response_text:
            try:
                cleaned_response = response_text.replace("```json", "").replace("```", "").strip()
                translated_batch = json.loads(cleaned_response)

                for verb, rus_translation in translated_batch.items():
                    if verb in updated_data and rus_translation:
                        clean_rus = str(rus_translation).strip().replace('"', '')

                        # Создаем недостающий блок translations в нужной структуре
                        updated_data[verb]["translations"] = {
                            "2": {
                                clean_rus: []
                            }
                        }
                        print(f"   ✔ '{verb}' ➡️ '{clean_rus}'")

                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(updated_data, f, ensure_ascii=False, indent=4)
                print(f"💾 Пачка {batch_idx} успешно сохранена!")

            except json.JSONDecodeError as je:
                print(f" ❌ Ошибка парсинга JSON ответа модели: {je}")
                print(f"Ответ был:\n{response_text}")

        print("⏳ Пауза 5 секунд перед следующей пачкой...")
        time.sleep(5)

    print(f"\n✅ Готово! Итоговый файл сохранен как: {OUTPUT_FILE}")


if __name__ == "__main__":
    translate_missing_translations()