# Bildirim ve Yeniden Deneme Merkezi

Şablonları doldur, işleri kalıcı kuyruğa yaz ve kontrollü hata senaryolarıyla yeniden denemeyi öğren.

![Uygulama ekranı](docs/screenshot.png)

**Durum:** Çalıştırılabilir yerel temel sürüm (v0.1). E-posta/SMS simülasyonu · yerel teslim günlüğü.

## Proje Kurulumu

Node.js 24.x ve npm gerekir. İlk kurulumda npm paketlerini indirmek için internet bağlantısı gerekir. Node 24 `node:sqlite` deneysel uyarısı yazabilir; bu uyarı tek başına hata değildir.

```bash
npm ci
npm run dev
```

Tarayıcı: http://localhost:3000. Giriş: **demo@example.com / Demo12345!**. İkinci hesap: **other@example.com / Demo12345!**.

İkinci terminalde, aynı proje klasöründe:

```bash
npm run seed
```

Seed komutu örnek kayıt ekler; tekrar çalıştırmak yeni örnek kayıtlar oluşturabilir. Bazı projelerde başlangıç kataloğu zaten hazırdır; seed bunu açıklar.

## Derleme ve test

```bash
npm test
npm run typecheck
npm run build
npm start
```

`npm run dev` sırasında değişiklikleri Vite işler. `npm start` için önce build gerekir. Testler RAM veritabanı ve rastgele portla çalışır; kendi verilerini oluşturur. Mevcut demo veritabanını değiştirmez. Typecheck TypeScript giriş/ortak bileşenlerini ve Vue şablonlarını kapsar; JavaScript backend'in tam tip doğrulaması değildir.

## Çalışan özellikler

- İsim değişkenli şablon
- Üç demo kanal
- Dedupe anahtarı
- Üstel yeniden deneme
- Başarısız işi yeniden başlatma

## Kapsam sınırı

Gerçek e-posta, SMS ve cihaz push gönderilmez. delivered durumu yerel simülatörün kabulüdür; gerçek alıcıya ulaştığı anlamına gelmez. Tek süreç worker kullanılır.

## Dosyalar ve akış

| Dosya | Sorumluluk |
| --- | --- |
| client/Workspace.vue | Projeye özel formlar, listeler, kullanıcı eylemleri |
| client/App.vue | Oturum açma ve ortak sayfa düzeni |
| client/api.ts | Fetch, hata mesajı, para/tarih yardımcıları |
| server/project.js | Alan kuralları, SQL sorguları ve API uçları |
| server/core.js | Veritabanı, doğrulama, oturum ve SSE yardımcıları |
| server/index.js | Express başlatma, güvenlik başlıkları ve statik dosyalar |
| schema.sql | Uygulamanın gerçek tablo/indeks şeması; referans amaçlı |
| tests/project.test.js | Gerçek HTTP istekleriyle kritik iş kuralları |
| scripts/seed.js | Örnek veri ekleme |
| PROJECT_DETAILS.pdf | Beş sayfalık proje açıklaması, API, test ve geliştirme rehberi |

Arayüz → aynı origin `/api` → oturum/sahiplik/doğrulama → iş kuralı → SQLite → JSON → görünüm. SQLite `data/app.sqlite` dosyasında kalıcıdır. Bu küçük uygulamalarda tablolar açılışta `CREATE TABLE IF NOT EXISTS` ile kurulur; sürümlü migration sistemi henüz yoktur.

## İş kuralı

notifications (owner,dedupe) UNIQUE ile aynı işi tekilleştirir. Worker her saniye zamanı gelen işleri alır. retry-demo alıcısı üçüncü denemede başarılı olur; fail-demo üç denemede failed olur. Sonraki zaman 2^attempt saniyedir. Şablon eksik değişken içerirse iş kuyruğa girmeden 422 döner.

## API haritası

Oturum: `POST /api/auth/login` JSON `{"email":"demo@example.com","password":"Demo12345!"}`; `GET /api/auth/me`; `POST /api/auth/logout`. Çerez HttpOnly + SameSite=Strict. Tarayıcı aynı origin kullanır.

| Yöntem ve yol | Girdi | Başarı |
| --- | --- | --- |
| GET /api/templates | Gövde yok | 200 |
| POST /api/templates | JSON: name, body | 201 |
| GET /api/notifications | Gövde yok | 200 |
| POST /api/notifications | JSON: templateId, dedupe, variables, channel, recipient | 202 |
| POST /api/notifications/:id/retry | Gövde yok | 200 |

Uç nokta gövdelerinin somut örnekleri `tests/project.test.js` ve `scripts/seed.js` içinde bulunur. `:id` alanlarını önceki oluşturma yanıtından al. Hatalar JSON `{"error":"açıklama"}` biçimindedir; 401 giriş, 403 rol/origin, 404 kayıt/sahiplik, 409 çakışma, 422 doğrulama, 429 kota anlamına gelir. Listeler küçük yerel demo kapsamındadır; tümünde sayfalama yoktur.

```text
POST /api/templates
{"name":"Welcome","body":"Merhaba {{name}}"}
201 {"id":"<template-id>"}
```

## Kabul senaryoları

- [ ] Eksik şablon değişkeni iş oluşturmadan 422 dönmeli.
- [ ] Aynı dedupe anahtarı aynı işi döndürmeli.
- [ ] Yerel başarılı alıcı delivered durumuna gelmeli.
- [ ] retry-demo için üçüncü deneme başarı, fail-demo için failed görülmeli.

## İlk gün yapacağın çalışma

Şablon oluştur ve aynı dedupe ile iki gönderim yap. Tek satır oluştuğunu gör. retry-demo alıcısıyla artan deneme sayısını izle.

## Sonraki geliştirmeler

- [ ] Sağlayıcı adaptörleri ekle
- [ ] Outbox ve ayrı worker kur
- [ ] İş sahiplenme/lease mekanizması ekle
- [ ] Webhook teslim raporlarını ayır

## GitHub sunumu

Önce kurulumu çalıştır, testleri oku ve en az bir davranışı kendin geliştir. Her gün yaptığın gerçek değişikliği açıklayan commit at. `feat: ...`, `fix: ...`, `test: ...`, `docs: ...` örnek öneklerdir. `docs/screenshot.png` başlangıç sürümünün ekranıdır; değişikliklerinden sonra kendi ekranınla güncelle.

`.gitignore`, node_modules, dist, data ve .env dosyalarını dışarıda bırakır. Veritabanını, anahtarları veya gerçek müşteri/aday belgelerini GitHub'a koyma. GitHub repo oluşturma/yükleme bu paket tarafından otomatik yapılmaz.

## Ortam ayarları

`.env.example` dosyasını `.env` olarak kopyala; dosya varsayılan npm komutlarında otomatik okunmaz. Kullanmak için `node --env-file=.env server/index.js --dev`. PORT varsayılan 3000, HOST 127.0.0.1, DB_PATH data/app.sqlite. DEMO_PASSWORD yalnız yeni veritabanında hesap oluşturulurken kullanılır; var olan parolayı değiştirmez. COOKIE_SECURE yalnız HTTPS ortamında 1 olmalı. Farklı projeleri aynı anda çalıştırırken farklı PORT kullan.

## Dağıtım notu

Bu sürüm yerel portfolyo/öğrenme içindir. Genel internete açmadan önce demo hesaplarını kaldırıp kayıt/parola sıfırlama ve gerçek kullanıcı yaşam döngüsü ekle. Tek süreç/senkron SQLite yaklaşımı yoğun trafikli hizmet için hedef mimari değildir. PostgreSQL geçişinde SQL tipleri, transaction sınırları, indeksler, migration ve yedeklemeyi ayrıca tasarla. Dockerfile genel Node uygulaması içindir; Docker runner ve FFmpeg gibi özel bağımlılıklar otomatik kurulmaz.

## Mülakat provası

Teslim edildi, sağlayıcı kabul etti ve kullanıcı gördü durumları aynı mı? Bir iş iki worker tarafından alınırsa ne olur?

## Lisans

MIT; bağımlılıkların kendi lisansları saklıdır.
