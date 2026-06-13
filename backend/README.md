# Pickwise Backend

Pickwise'in FastAPI tabanlı ajan backend'i. Kullanıcı mesajlarını LangGraph akışıyla işler, eksik alışveriş kriterlerini sorar, Tavily ile web araması yapar, Jina ile sayfa içeriği toplar ve Gemini ile ürün önerileri üretir.

## Çalıştırma

```bash
uv sync
uv run fastapi dev main.py
```

Backend varsayılan olarak `http://127.0.0.1:8000` adresinde çalışır.

## Ortam Değişkenleri

`backend/.env.example` dosyasını `backend/.env` olarak kopyala:

```bash
cp .env.example .env
```

```env
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_api_key
JINA_API_KEY=your_jina_api_key
```

## Endpointler

```http
GET /health
```

Sağlık kontrolü için kullanılır.

```http
POST /api/chat/stream
```

Sohbet akış endpoint'i. Server-Sent Events ile `thread`, `status`, `search`, `interrupt`, `message`, `done` ve `error` olaylarını yayınlar.

`error` olayları güvenli ve stabil biçimde şu alanları döndürür:

```json
{ "message": "...", "type": "...", "retryable": true }
```

## Demo Notları

- Sohbet oturumu belleği şu anda `InMemorySaver` ile proses içinde tutulur.
  Backend yeniden başlarsa mevcut `thread_id` geçmişi kaybolur. Production için
  SQLite veya Postgres tabanlı kalıcı LangGraph checkpointer kullanılmalıdır.
- Eksik API key veya provider hataları kullanıcıya ham stack trace olarak
  döndürülmez; frontend anlaşılır bir hata mesajı gösterir.

## Monorepo Notu

Bu klasör Pickwise monoreposunun backend paketidir. Genel kurulum ve proje tanıtımı için kök dizindeki `README.md` dosyasına bak.
