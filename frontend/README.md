# Pickwise Frontend

Pickwise'in Next.js tabanlı sohbet arayüzü. Kullanıcının mesajlarını backend'deki ajan akışına iletir, Server-Sent Events ile gelen durumları canlı gösterir ve ürün önerilerini sohbet deneyimi içinde sunar.

## Çalıştırma

```bash
bun dev
```

Arayüz `http://localhost:3000` adresinde açılır.

## Ortam Değişkeni

```env
PICKWISE_API_URL=http://127.0.0.1:8000
```

Bu değer, Next.js API route'unun istekleri yönlendireceği backend adresidir. Belirtilmezse varsayılan olarak `http://127.0.0.1:8000` kullanılır.

## Komutlar

```bash
bun dev      # geliştirme sunucusu
bun build    # production build
bun start    # production sunucusu
bun lint     # lint kontrolü
```

## Monorepo Notu

Bu klasör Pickwise monoreposunun frontend paketidir. Genel kurulum ve proje tanıtımı için kök dizindeki `README.md` dosyasına bak.

> Bu paket Bun ile kilitlenmiştir. pnpm lock dosyası üretilmemelidir.
