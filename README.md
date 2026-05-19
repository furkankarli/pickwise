# Pickwise

Pickwise, BTK Akademi Hackathon 2026 için geliştirilmiş yapay zeka destekli bir alışveriş asistanıdır. Kullanıcı ne almak istediğini yazar; uygulama ihtiyacı netleştirmek için akıllı sorular sorar, güncel web sonuçlarını araştırır ve kriterlere göre ürün önerileri sunar.

## Neler Yapar?

- Kullanıcı ihtiyacını ürün kategorisine göre analiz eder.
- Eksik kriterleri tek tek sorarak karar sürecini netleştirir.
- Tavily ile güncel ürün araması yapar.
- Jina ile ürün sayfalarından içerik toplar.
- LangGraph tabanlı ajan akışıyla önerileri, takip sorularını ve yeni aramaları yönetir.
- Next.js arayüzünde canlı durum, arama kaynakları ve sohbet akışını gösterir.

## Monorepo Yapısı

```text
pickwise/
├── backend/   # FastAPI, LangGraph, Gemini, Tavily ve Jina entegrasyonu
├── frontend/  # Next.js, React, Tailwind CSS ve sohbet arayüzü
└── README.md  # Proje tanıtımı ve çalıştırma rehberi
```

Bu proje GitHub'a tek monorepo olarak yüklenebilir. En temiz kurulum için Git deposunun kök dizinde olması, `frontend/` ve `backend/` klasörlerinin ayrı repository olarak tutulmaması önerilir.

## Teknolojiler

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, Python 3.11, LangGraph, LangChain
- Yapay zeka: Google Gemini
- Arama ve veri toplama: Tavily Search, Jina Reader
- Paket yönetimi: Bun veya pnpm, uv

## Başlarken

### Gereksinimler

- Node.js 20+
- Bun veya pnpm
- Python 3.11+
- uv
- Google API key
- Tavily API key
- Jina API key

### 1. Repoyu Hazırla

```bash
git clone <repo-url>
cd pickwise
```

### 2. Backend Ortam Değişkenleri

`backend/.env.example` dosyasını `backend/.env` olarak kopyalayıp kendi anahtarlarını ekle:

```bash
cp backend/.env.example backend/.env
```

```env
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_api_key
JINA_API_KEY=your_jina_api_key
```

### 3. Backend'i Çalıştır

```bash
cd backend
uv sync
uv run fastapi dev main.py
```

Backend varsayılan olarak `http://127.0.0.1:8000` adresinde çalışır.

### 4. Frontend'i Çalıştır

Yeni bir terminalde:

```bash
cd frontend
bun install
bun dev
```

Alternatif olarak pnpm kullanabilirsin:

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Ortam Değişkenleri

Backend:

| Değişken | Açıklama |
| --- | --- |
| `GOOGLE_API_KEY` | Gemini modelini çalıştırmak için kullanılır. |
| `TAVILY_API_KEY` | Güncel web araması için kullanılır. |
| `JINA_API_KEY` | Ürün sayfalarını okunabilir içeriğe dönüştürmek için kullanılır. |

Frontend:

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `PICKWISE_API_URL` | `http://127.0.0.1:8000` | Next.js API route'unun istekleri yönlendireceği backend adresi. |

## Komutlar

Kök dizinden:

```bash
pnpm dev:frontend
pnpm dev:backend
pnpm build:frontend
pnpm lint:frontend
```

Alt dizinlerden:

```bash
cd frontend && bun dev
cd backend && uv run fastapi dev main.py
```

## API

Backend ana endpoint'i:

```http
POST /api/chat/stream
```

Bu endpoint Server-Sent Events ile aşağıdaki olayları yayınlar:

- `thread`: sohbet oturumu kimliği
- `status`: ajan akışındaki aktif adım
- `search`: arama sorgusu ve kaynaklar
- `interrupt`: kullanıcıdan ek bilgi isteyen soru
- `message`: asistandan nihai veya ara yanıt
- `done`: akışın tamamlandığı bilgisi
- `error`: hata bilgisi

Sağlık kontrolü:

```http
GET /health
```

## Hackathon Notu

Pickwise, BTK Akademi Hackathon 2026 kapsamında alışveriş kararlarını daha hızlı, bilinçli ve güncel veriye dayalı hale getirmek için geliştirildi. Projenin ana fikri, klasik "en iyi ürünler" listeleri yerine kullanıcının gerçek ihtiyacını anlayan ve buna göre canlı araştırma yapan bir asistan deneyimi sunmaktır.

## GitHub'a Yüklemeden Önce

- `backend/.env` dosyasını commit etme.
- Kök dizinde tek bir Git deposu kullan.
- `frontend/node_modules`, `frontend/.next`, `backend/.venv` gibi üretilen klasörleri commit etme.
- API anahtarlarını GitHub Secrets veya deployment platformunun environment ayarlarıyla yönet.
- Eğer `frontend/` ve `backend/` içinde ayrı `.git` klasörleri varsa, GitHub'a tek monorepo olarak yüklemeden önce bu iç Git depolarını kaldırıp kökte yeni bir Git deposu başlat.

## Lisans

Bu proje hackathon prototipi olarak hazırlanmıştır. Lisans tercihini netleştirdikten sonra `LICENSE` dosyası ekleyebilirsin.
