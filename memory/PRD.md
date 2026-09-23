# Ritim — Ürün ve teknik devir notları

## Problem statement
Mobil sağlık/yaşam uygulaması: beslenme, uyku ve sürdürülebilir alışkanlıkları birleştirir. Kalori takibi yerine diyetisyenin Food Naturalness Index (FNI) metodolojisi ve bütüncül korelasyonlar kullanılır. Organik minimalizm, kapsül kartlar, yumuşak mint/şeftali/mercan renkleri, lavanta dinlenme modu; akışkan dairesel günlük puan ve bento ana sayfa. Dört soruluk kilo sormayan tanışma, fotoğraf analizi prototipi, zorunlu kaynak etiketi, güvenli hesaplar, ücretsiz/Pro bayrakları, klinik PDF.

## Kullanıcı tercihleri (sabit)
- Arayüz Türkçe.
- E-posta/şifre + Google girişi.
- Ücretsiz/Pro deneme geçişi; gerçek ödeme yok.
- Fotoğraf tanıma ve besin yanıtları örnek/simüle olacak; gerçek AI servisi istenmedi.
- Tasarım kullanıcının sağladığı yönergelerden türetildi. Tasarım ajanı bu nedenle çağrılmadı.

## Personalar
1. Kalori saymadan beslenme düzenini anlamak isteyen yetişkin.
2. Katı hedefler yerine esnek, yargılamayan alışkanlık takibi isteyen kullanıcı.
3. Danışanının kayıtlarını paylaşılabilir bir raporda inceleyen diyetisyen (bu sürümde ayrı uzman hesabı yok).

## Mimari
- Expo SDK 57 / React Native / Expo Router. iOS/Android öncelikli, mobil boyutta web önizlemesi.
- Tek kök oturum kapısı; karşılama → tanışma → dört sekmeli uygulama. Camera, düzenleyiciler ve detaylar yüksek seviyede native Modal/Sheet.
- React context ile merkezi günlük veri ve oturum durumu; tüm değişimler sunucudan yenilenir.
- Tema `/app/frontend/src/theme.ts`, açık Gün ışığı ve Pro koyu Gece bahçesi. Renk anahtarları `/app/design_guidelines.json` ile uyumlu.
- FastAPI `/api`, MongoDB Motor, Pydantic modelleri. Mongo `_id` hiçbir yanıta taşınmaz.
- Koleksiyonlar: users, meals, daily_logs, detections, usage, user_sessions, images, assets, auth_attempts.
- Kullanıcı/tarih günlük-log ve usage bileşik benzersiz indeksleri; e-posta/user_id benzersiz; oturum TTL; meal detection_id benzersiz (idempotent kayıt).
- Parolalar bcrypt, 7 günlük rastgele bearer oturumları DB'de SHA256 özeti; logout iptali. Native tokenlar shipped utility aracılığıyla SecureStore'da. Web önizlemesi shipped utility secure fallback kullanır, tarayıcı donanımsal Keychain sunmaz.
- Google: managed OAuth; platforma özgü callback, tek seferlik session_id, backend identity exchange, varolan e-postayla hesap birleştirme.
- Fotoğraflar gerçek Emergent Managed Object Storage'a yüklenir; boyut sınırı, JPEG dönüştürme, EXIF çıkarma, sahiplik kontrollü API geri okuma. Public bowl görseli de aynı saklama servisinde.
- Rapor: ReportLab, gömülü DejaVuSans Türkçe desteği; son30 gün; native sharing, web preview download.

## Temel kurallar
- FNI: ev95, restoran65, paketli30.
- Öğün: %60FNI + %40makro denge. Makro dağılım/lif/şeker formülü `/app/backend/scoring.py` içinde açıklanır. Klinik olarak doğrulanmış bir skor olarak sunulmaz.
- Günlük puan: beslenme%60, uyku%25, su%15; yalnızca girilmiş bileşenler ağırlıkları yeniden ölçekleyerek kullanılır. Verisiz kullanıcıya sahte puan yok.
- Insight: uyku<6, yerel saat>=15, öğleden sonra öğün başına şeker sabah ortalamasından yüksek; yeterli iki zaman dilimi verisi şart. Nedensellik iddiası yok, görünür tıbbi tavsiye değildir uyarısı var.
- Free analiz5/gün sunucuda atomik denetlenir; Pro sınırsız. Insight/mikro grafik/tema sunucuda plan bazlı.
- Dinlenme modu için kısa not zorunlu; 7 günlük çizgide gün boş değil lavanta olarak görünür.
- Su8bardak/uyku8saat genel referans, kişisel tıbbi hedef değil.

## Uygulananlar — 2026-09-23
- Türkçe karşılama, kayıt/giriş, dört adım tanışma ve fotoğraf aha ekranı.
- Organik bento ana sayfa, animasyonlu puan halkası/parlama, kaydırmalı beslenme/uyku/su kartları, öğün özeti.
- Kamera/galeri izin ön açıklaması, önce mevcut izin kontrolü, sınırlı tekrar isteme, ayar butonu, örnek öğün fallback.
- Gerçek fotoğraf saklama + açıkça örnek olduğu belirtilen üç analiz senaryosu; zorunlu ev/restoran/paketli etiketi; öğün türü; kayıt/detay/silme/filtreli geçmiş.
- Uyku/su takip, mikro günlük, dinlenme modu, 7gün lavanta çizelge.
- Pro deneme geçişi, insight, dört mikro besin grafiği, temalar, ücretsiz plana dönünce otomatik açık tema.
- Son30 gün PDF raporu ücretsiz dahil.
- 16 backend regresyon testi. Auth/izolasyon/etiket/skor/limit/Pro/medya/PDF/insight kapsandı; hepsi geçti.
- Telefon önizlemesinde giriş/tanışma/öğün94ve76/su/uyku/dinlenme/filtreler/silme/Pro tema/downgrade/PDF self-test geçti.
- Test ajanı kamera panel CTA erişimini HIGH bildirdi. Sabit sınırlandırılmış panel, bağımsız scroll, sabit CTA footer eklendi. 390x844 ve360x740 self-testinde gerçek click akışı geçti.
- SVG transform-origin uyarısı düzeltildi, native Image ile dashboard görselleri doğrulandı. Son tarayıcı konsolunda uygulama hatası yok. JS/Python lint ve TypeScript kontrolü temiz.
- Galeriden JPEG seçimi → gerçek managed storage yükleme → kaynak etiketi → kayıt → sahiplik kontrollü fotoğraf görüntüleme uçtan uca self-test geçti. Çıkış sonrası karşılama ekranı ve Google sağlayıcıya doğru callback URL ile yönlendirme de doğrulandı.

## Doğrulama sınırları
- Gerçek Google kullanıcı sağlayıcı oturumu kullanıcı kimliği olmadan tamamlanmadı. Callback kodu ve geçersiz session reddi var; gerçek hesap ile son doğrulama gerekir.
- Fiziksel iOS/Android kamera donanımı, izin ekranı ve native paylaşım OS akışı henüz gerçek cihazda test edilmedi.
- Tanıma/makro/mikro verileri örnek senaryo; canlı USDA veya gerçek Vision entegrasyonu yok. Uygulama ve PDF bunu açıkça belirtir.
- Pro gerçek abonelik değildir; kullanıcı tercihi gereği ücret alınmaz.
- Bu bir fonksiyonel prototiptir; üretim ve sağlık verisi uyumluluğu onayı verilmez.

## Öncelikli backlog
### P0 — Gerçek kullanıma hazırlık
1. Kullanıcının diyetisyen onayıyla FNI/makro referanslarını bilimsel/klinik olarak kalibre et; güvenli iddia ve risk değerlendirmesi.
2. Google ile gerçek oturum + iOS/Android kamera/galeri/izin/paylaşım cihaz test matrisi.
3. Sağlık verisi açık rıza, KVKK/GDPR politika, veri silme/retention/hesap silme, güvenlik/erişim denetimi ve yedekleme süreçleri.
4. E-posta doğrulama, şifre sıfırlama ve gelişmiş kötüye kullanım koruması.
5. Web sürümü ürünleştirilirse HttpOnly oturum modeline geç (mevcut web yalnız mobil önizleme).
### P1
- Gerçek Vision sağlayıcısı + USDA besin arama, porsiyon doğrulama ve kullanıcı düzeltme akışı.
- Native mağaza aboneliği, makbuz doğrulama; prototip üyelik geçişini üretimde kaldır.
- Gün bazlı arşiv/paginasyon, besin etiket düzenleme, kişisel alışkanlık hedefleri, erişilebilirlik ve font büyütme matrisi.
- Kota gün sınırını doğrulanmış kullanıcı saat dilimiyle sabitle; gelişmiş oturum/limit metrikleri.
### P2
- Kullanıcının açık rızasıyla diyetisyen paylaşım daveti ve uzman paneli.
- Haftalık trendler, isteğe bağlı hatırlatıcılar, kişiselleştirilmiş günlük soruları.

## Sonraki görev
Kullanıcı görsel/klinik yaklaşımı değerlendirsin; ilk olarak gerçek cihaz ve Google giriş doğrulamasını, ardından gerçek besin veri entegrasyonunu seçsin.