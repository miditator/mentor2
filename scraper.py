import json
import time
from bs4 import BeautifulSoup
import requests

BASE_URL = "https://test-english.com/grammar-points/"


def scrape_test_english():
  # 🔥 Расширяем заголовки, чтобы сайт не принимал нас за простого бота
  headers = {
      "User-Agent": (
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,"
          " like Gecko) Chrome/122.0.0.0 Safari/537.36"
      ),
      "Accept": (
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      ),
      "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
  }

  print("📥 Загружаем главную страницу со списком уровней и тем...")
  response = requests.get(BASE_URL, headers=headers)
  if response.status_code != 200:
    print(f"❌ Ошибка загрузки главной страницы: {response.status_code}")
    return

  soup = BeautifulSoup(response.text, "html.parser")
  results = {}

  # Шаг 1: Находим блоки уровней и ссылки на темы
  # Структура test-english обычно содержит блоки уровней с заголовками и ссылками
  level_blocks = soup.select(
      ".stw-level-box, .cet-level, div[class*='level'], .elementor-widget-container"
  )

  if level_blocks:
    for block in level_blocks:
      level_title_elem = block.find(["h2", "h3", "h4", "span"])
      level_name = (
          level_title_elem.get_text(strip=True)
          if level_title_elem
          else "General"
      )

      # Фильтруем мусорные блоки, оставляя только уровни (A1, A2, B1 и т.д.)
      if not any(
          lvl in level_name.upper() for lvl in ["A1", "A2", "B1", "B2", "C1"]
      ):
        continue

      if level_name not in results:
        results[level_name] = []

      topic_links = block.find_all("a", href=True)
      for link in topic_links:
        topic_title = link.get_text(strip=True)
        topic_url = link["href"]
        # Исключаем дубли и пустые ссылки
        if (
            topic_title
            and topic_url
            and topic_url.startswith("http")
            and not any(
                t["url"] == topic_url for t in results[level_name]
            )
        ):
          results[level_name].append(
              {"title": topic_title, "url": topic_url, "rules": []}
          )
  else:
    print(
        "⚠️ Не удалось найти стандартные блоки уровней. Проверьте актуальную"
        " верстку сайта."
    )
    return

  total_topics = sum(len(topics) for topics in results.values())
  print(
      f"✅ Найдено уровней: {len(results)}. Всего тем для парсинга:"
      f" {total_topics}\n"
  )

  # Шаг 2: Проходим по каждой теме и собираем детальные правила/подзаголовки
  for level, topics in results.items():
    print(f"\n📂 Обработка уровня: {level}")
    for topic in topics:
      url = topic["url"]
      print(f"   ➡️ Парсим тему: {topic['title']}")
      try:
        # Делаем паузу в 1 секунду между запросами, чтобы сайт не заблокировал IP за DDoS
        time.sleep(1)
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
          topic_soup = BeautifulSoup(resp.text, "html.parser")

          # Ищем заголовки внутри статьи с правилом (обычно h2, h3 содержат пункты правила)
          rule_elements = topic_soup.select(
              ".entry-content h2, .entry-content h3, .et_pb_module h2,"
              " .et_pb_module h3"
          )
          rules = []
          for r in rule_elements:
            rule_text = r.get_text(strip=True)
            # Исключаем служебные блоки сайта
            if rule_text and not any(
                service_word in rule_text.lower()
                for service_word in [
                    "leave a reply",
                    "comments",
                    "exercises",
                    "pdf",
                    "listen",
                    "grammar points",
                    "share this",
                ]
            ):
              rules.append(rule_text)

          topic["rules"] = rules
          print(f"      ✔️ Найдено правил/подзаголовков: {len(rules)}")
        else:
          print(f"      ❌ Ошибка доступа к странице темы: {resp.status_code}")
      except Exception as e:
        print(f"      ❌ Ошибка при запросе {url}: {e}")

  # Шаг 3: Сохранение результата в JSON-файл
  output_filename = "test_english_structured.json"
  with open(output_filename, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

  print(
      f"\n🎉 Парсинг завершен! Все данные сохранены в файл '{output_filename}'."
  )


if __name__ == "__main__":
  scrape_test_english()