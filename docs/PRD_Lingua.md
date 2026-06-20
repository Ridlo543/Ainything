# Product Requirements Document (PRD)

**Product Name:** Lingua  
**Tagline:** Multilingual menu and guest assistant for tourist-heavy restaurants  
**Version:** 1.2  
**Date:** 16 Juni 2026  
**Primary Market:** Restoran dan cafe di destinasi wisata Indonesia, dimulai dari Bali dan Jakarta  
**Business Model:** B2B SaaS untuk restoran, dengan wisatawan sebagai end user

## 0. Critical Review of the Initial Idea

Ide awal punya peluang karena masalah komunikasi di hospitality nyata: turis ingin memahami menu, restoran ingin mengurangi salah order, dan staf sering membuang waktu untuk pertanyaan berulang. Namun PRD awal terlalu lebar untuk MVP pertama. Produk ingin menjadi translator, rekomendasi makanan, cultural advisor, dashboard, WhatsApp fallback, POS, reservasi, pembayaran, dan travel assistant sekaligus.

Kritik utama:

- **Positioning terlalu luas.** "Hospitality assistant" bisa berarti restoran, hotel, travel, concierge, POS, dan reservation. Untuk MVP, target harus dipersempit ke restoran/cafe dengan traffic turis tinggi.
- **Value proposition belum cukup beda dari Google Translate dan QR menu biasa.** Pembeda harus berupa "menu yang sudah dipahami sistem": bahan, alergi, halal, tingkat pedas, best seller, dan konteks restoran.
- **MVP terlalu berat.** OCR menu, RAG, multilingual chat, voice, rekomendasi personal, admin dashboard, analytics, dan WhatsApp fallback adalah beberapa produk sekaligus. MVP perlu diprioritaskan.
- **Metric awal terlalu optimistis dan belum terukur.** Klaim mengurangi 70-80% komunikasi staf, menaikkan ARPU 15%, dan 90% query puas perlu metode pengukuran yang jelas.
- **Risiko akurasi tinggi.** Kesalahan pada alergi, halal, bahan alkohol, atau rekomendasi untuk diet tertentu bisa merusak kepercayaan dan berisiko hukum.
- **Operasional onboarding diremehkan.** Restoran sering punya menu tidak rapi, update harga cepat, gambar buruk, bahasa campuran, dan staf yang tidak rutin menjaga data.
- **Biaya AI dan latensi perlu dikontrol sejak awal.** Response time < 2 detik tidak realistis untuk semua kasus jika setiap request menjalankan OCR + LLM + retrieval. Target harus dibedakan antara cached menu dan fresh analysis.

Keputusan produk setelah kritik:

- MVP fokus pada **platform menu dan guest support multi-restoran**, bukan travel super-app.
- Turis tidak perlu login atau install app. Mereka scan QR meja dan langsung pakai.
- Restoran menjadi pembayar dan admin data.
- Satu deployment Lingua harus melayani banyak organisasi/restoran. Ini bukan aplikasi terpisah per restoran.
- Rekomendasi harus berbasis menu restoran yang sudah diindeks, bukan hallucinated generic travel advice.
- Voice, POS, reservation, payment, AR, dan travel planning masuk roadmap setelah restoran pilot terbukti.

## 1. Executive Summary

Lingua adalah platform PWA + SaaS multi-tenant yang membantu banyak restoran di area wisata melayani tamu internasional dengan menu multilingual, penjelasan bahan, filter diet, rekomendasi makanan, dan fallback ke staf ketika sistem tidak yakin.

Produk ini dirancang untuk mengurangi pertanyaan berulang seperti "apa ini?", "apakah halal?", "seberapa pedas?", "mengandung kacang?", "apa menu favorit?", dan "bagaimana cara makan hidangan ini?". Sistem menggunakan menu restoran, knowledge base restoran, dan AI guardrails agar jawaban tetap dalam konteks restoran.

Klarifikasi model produk:

- Lingua adalah satu platform untuk banyak tenant, bukan satu app per restoran.
- Tenant utama adalah `Organization` atau pemilik billing. Satu organization dapat memiliki satu atau banyak restoran.
- `Restaurant` adalah venue customer-facing yang punya menu, knowledge base, staff inbox, analytics, dan QR table sendiri.
- `Restaurant Location` atau branch dipakai ketika satu brand memiliki beberapa cabang.
- QR meja selalu mengarah ke konteks restoran dan meja tertentu, misalnya `/r/uma-karang/table/T07` atau subdomain publik seperti `uma-karang.lingua.app/table/T07`.
- Dashboard admin/staff harus selalu scoped ke organization dan restaurant yang diizinkan membership.

## 2. Problem Statement

### Masalah Wisatawan

- Sulit memahami nama menu lokal, bahan, tingkat pedas, dan cara makan.
- Takut salah pesan karena alergi, diet, halal, vegetarian, atau preferensi rasa.
- Tidak selalu nyaman bertanya berulang ke staf karena hambatan bahasa.

### Masalah Restoran

- Staf menghabiskan waktu menjawab pertanyaan menu yang berulang.
- Potensi salah order meningkat ketika tamu dan staf memakai bahasa berbeda.
- Menu PDF/QR biasa tidak membantu menjelaskan bahan, budaya, dan rekomendasi.
- Owner tidak punya data jelas tentang pertanyaan turis, menu yang diminati, dan hambatan pemesanan.

### Why Now

- Turis makin terbiasa memakai QR menu dan browser mobile.
- LLM, OCR, dan text-to-speech lebih terjangkau, tetapi tetap perlu kontrol biaya.
- Restoran kecil dan menengah butuh solusi ringan tanpa mengganti POS.

## 3. Product Positioning

**Lingua is a multi-restaurant QR menu and guest support platform for restaurants serving international guests.**

Pembeda utama:

- Berbasis data restoran, bukan translator generik.
- Menjelaskan bahan, alergi, halal, pedas, dan konteks budaya.
- Memberi rekomendasi yang bisa diaudit dari menu aktual.
- Menghubungkan tamu ke staf dengan ringkasan percakapan ketika AI tidak cukup.
- Mendukung banyak restoran dalam satu platform dengan tenant isolation, QR, dashboard, dan analytics per restoran.
- Tidak memaksa restoran mengganti POS pada fase awal.

## 4. Target Users

### Buyer: Restaurant Owner or Manager

- Restoran/cafe di area wisata dengan banyak tamu asing.
- Punya menu bahasa Indonesia/Inggris yang sering ditanyakan.
- Pain utama: waktu staf, salah order, conversion menu, dan review pelanggan.
- Bisa berupa single restaurant atau operator dengan beberapa restoran/cabang.

### End User: International Tourist

- Usia 20-60 tahun.
- Menggunakan smartphone pribadi.
- Bahasa awal prioritas: English, Chinese Simplified, Korean, Japanese, Arabic, Hindi, French, German, Spanish, Indonesian.
- Butuh jawaban cepat tanpa install app.

### Internal User: Staff

- Menerima request bantuan dari meja.
- Melihat ringkasan konteks sebelum menghampiri tamu.
- Tidak perlu belajar dashboard kompleks.

## 5. Jobs To Be Done

- Saat saya melihat menu lokal, saya ingin tahu arti menu, bahan, rasa, dan risiko alergi supaya bisa memilih dengan percaya diri.
- Saat saya punya pantangan makan, saya ingin memfilter menu yang aman supaya tidak perlu bertanya berkali-kali.
- Saat restoran ramai, saya ingin AI menjawab pertanyaan umum supaya staf bisa fokus pada servis fisik.
- Saat AI tidak yakin, saya ingin staf mendapat ringkasan percakapan supaya saya tidak mengulang penjelasan dari awal.

## 6. MVP Scope

### P0 - Must Have

- QR table access tanpa login untuk turis.
- Language selection dan auto browser language detection.
- Menu browsing multilingual dari data menu yang sudah diunggah restoran.
- Menu item detail: deskripsi, bahan utama, allergen flags, dietary flags, spice level, halal status jika tersedia, dan rekomendasi "good for".
- Text chat untuk pertanyaan menu dan restoran.
- Guardrail: jawaban hanya boleh berdasarkan menu/knowledge base restoran dan harus fallback ketika tidak yakin.
- Human fallback dengan ringkasan percakapan untuk staf.
- Admin dashboard sederhana untuk restoran:
  - kelola menu
  - kelola dietary/allergen flags
  - upload gambar/PDF menu untuk onboarding
  - lihat QR code per meja
  - lihat feedback dan pertanyaan populer

### P1 - Should Have

- OCR-assisted menu import untuk mempercepat onboarding.
- Precomputed translation untuk bahasa prioritas.
- Staff inbox real-time untuk fallback request.
- Quick feedback setelah sesi.
- Basic analytics: scan count, top questions, top viewed menu items, fallback rate.
- Browser-native speech input jika perangkat mendukung.

### P2 - Later

- Voice conversation penuh dengan STT/TTS pihak ketiga.
- Reservation, ordering, payment, POS integration.
- AR menu overlay.
- Multi-table group ordering.
- Loyalty and feedback automation.
- Travel itinerary assistant.

## 7. Non-Goals for MVP

- Tidak membangun POS baru.
- Tidak memproses pembayaran.
- Tidak membuat native mobile app.
- Tidak menjadi marketplace travel.
- Tidak mengklaim diagnosis medis atau jaminan 100% aman alergi.
- Tidak memakai AI untuk menjawab di luar konteks restoran.

## 8. Core User Flows

### Tourist Flow

1. Tamu duduk dan scan QR meja.
2. PWA terbuka dengan bahasa otomatis dari browser dan opsi ganti bahasa.
3. Tamu memilih preferensi: halal, vegetarian, vegan, nut-free, seafood-free, low spice, atau custom note.
4. Tamu melihat menu dalam bahasa pilihan.
5. Tamu membuka item menu untuk melihat bahan, rasa, allergen warning, dan rekomendasi.
6. Tamu bertanya lewat chat jika butuh penjelasan.
7. Jika AI tidak yakin atau tamu meminta staf, sistem mengirim fallback request.
8. Staf menerima ringkasan dan nomor meja.
9. Setelah sesi, tamu memberi quick feedback.

### Restaurant Admin Flow

1. Owner membuat akun restoran.
2. Admin mengisi profil restoran, bahasa default, jam buka, dan kontak staf.
3. Admin upload menu PDF/foto atau input manual.
4. Admin review hasil ekstraksi menu, memperbaiki bahan, harga, kategori, dietary flag, dan allergen flag.
5. Sistem membuat QR code per meja.
6. Admin memantau analytics dan memperbaiki knowledge base.

### Staff Flow

1. Staff membuka staff inbox di mobile/tablet.
2. Staff melihat request bantuan dengan nomor meja, bahasa tamu, dan summary.
3. Staff menandai request sebagai in progress atau resolved.
4. Jika jawaban harus diperbaiki, staff/admin menambahkan knowledge base note.

## 9. Functional Requirements

### Customer PWA

- Harus bisa dipakai di mobile browser tanpa install.
- Harus tetap nyaman di desktop/tablet untuk hotel concierge atau kiosk.
- Harus punya layout mobile-first dengan tap targets minimal 44px.
- Harus mendukung preferensi diet sebelum rekomendasi diberikan.
- Harus menampilkan disclaimer singkat untuk alergi dan halal: restoran tetap sumber kebenaran.
- Harus punya empty, loading, error, offline, dan low-confidence states.

### Admin Dashboard

- Harus multi-tenant: user hanya melihat restoran yang dia kelola.
- Harus mendukung organization dengan banyak restoran dan restaurant selector yang jelas.
- Harus punya workflow review data menu sebelum publish.
- Harus bisa menonaktifkan item yang sold out atau tidak tersedia.
- Harus punya preview customer view untuk bahasa tertentu.
- Harus menampilkan QR code per meja.
- Harus menampilkan public host/path QR per restoran agar owner tidak salah mencetak QR lintas restoran.

### AI Assistant

- Harus mengambil konteks dari menu, item, restaurant profile, dan knowledge base.
- Harus menolak menjawab jika pertanyaan di luar cakupan restoran.
- Harus memberi confidence/fallback signal untuk kasus alergi, halal, dan bahan yang tidak pasti.
- Harus menyimpan trace minimal untuk debugging: model, prompt version, retrieved documents, latency, dan fallback reason.

### Data Quality Gate (publish requirement)

- Sebuah menu hanya boleh dipublish jika tiap item punya nama, harga, dan status ketersediaan.
- Field alergi dan halal punya nilai `confidence` eksplisit. Jika data tidak ada, default-nya adalah "unknown -> staff confirm", bukan kosong atau ditebak.
- Item dengan `confidence = staff-confirm` boleh tampil tetapi harus memicu saran konfirmasi staf untuk pertanyaan berisiko (alergi/halal/alkohol).
- Restoran tetap satu-satunya sumber kebenaran untuk flag alergi/halal. AI tidak boleh menaikkan tingkat kepastian melebihi data yang diverifikasi restoran.

## 10. Success Metrics

### Pilot Metrics

- 10 restoran pilot aktif dalam 90 hari setelah MVP usable.
- Minimal 60% restoran pilot tetap aktif setelah 60 hari.
- Minimal 30% meja aktif melakukan scan selama jam makan di restoran pilot yang memasang QR.
- Minimal 50 sesi customer per restoran per bulan pada restoran pilot aktif.

### Product Metrics

- p95 first screen load <= 2.5 detik di koneksi 4G normal.
- p95 cached menu answer <= 2 detik.
- p95 AI answer untuk chat biasa <= 5 detik.
- Fresh OCR/import boleh lebih lambat, tetapi wajib punya progress state.
- Fallback rate target awal 10-25%. Terlalu tinggi berarti AI kurang membantu; terlalu rendah bisa berarti AI overconfident.
- Customer helpful feedback >= 80% untuk jawaban menu.
- Admin menu publish time <= 30 menit untuk menu <= 80 item setelah data awal tersedia.

### Measurement Method

Metrik produk di atas hanya valid jika terinstrumentasi. Setiap metrik diikat ke event konkret:

- Fallback rate = jumlah `fallback_requests` (atau `ai_events` dengan safety flag staff) dibagi total sesi chat.
- Helpful feedback = `feedback.helpful = true` dibagi total `feedback` untuk jawaban menu.
- Latency p95 = persentil `ai_events.latency_ms` per tipe (cached vs fresh).
- Scan/sesi aktif = jumlah `customer_sessions` per restoran per periode.

Jika sebuah metrik belum bisa dihitung dari tabel yang ada, instrumentasinya dianggap belum selesai dan menjadi blocker pilot.

### Cost Control Baseline

- Setiap restoran punya cap harian AI-call. Saat tercapai, sistem fallback ke "tanya staf", bukan memanggil LLM.
- Endpoint publik anonim memakai rate limit per sesi dan per IP untuk mencegah abuse dan ledakan biaya.
- Cap dan rate limit awal didefinisikan di `docs/Technical_Specification.md` dan ditinjau ulang setelah pilot.

### Business Metrics

- Restoran pilot bersedia membayar setelah trial.
- Minimal 3 testimoni owner/staff dengan bukti pengurangan pertanyaan berulang.
- Bukti awal upsell: item rekomendasi dilihat, ditanyakan, atau dipilih lebih sering. Kenaikan ARPU 15% tetap hipotesis, bukan target wajib MVP.

## 11. UX and UI Principles

- Customer screen harus langsung produktif, bukan landing page marketing.
- Aksi utama: browse menu, ask, filter preference, call staff.
- Visual harus bersih, cepat dipindai, dan tidak terasa seperti chatbot kosong.
- Menu item harus lebih kuat daripada chat. Chat membantu, tetapi menu tetap pusat pengalaman.
- Gunakan status jelas untuk "AI confident", "needs staff confirmation", dan "unknown".
- Desain harus mendukung teks panjang dari bahasa Jerman, Arab RTL, Chinese/Japanese/Korean, dan nama makanan lokal.

## 12. Business Model

### Pilot

- Free atau low-cost pilot untuk 10 restoran pertama.
- Fokus validasi penggunaan meja, feedback staf, dan willingness to pay.

### Paid Tiers

- Starter: menu multilingual + QR + basic analytics.
- Pro: AI chat + staff inbox + advanced dietary/recommendation + more languages.
- Enterprise: multi-branch, custom integration, SLA, POS/reservation integration.

## 13. Go-To-Market

### Phase 1: Validation

- Interview 15-25 owner/manager di Bali/Jakarta.
- Observe actual guest-staff interactions.
- Collect 10 real menus with messy formats for onboarding test.

### Phase 2: Pilot

- 3-5 restaurants for alpha.
- 10 restaurants for public pilot.
- Installation package: QR table cards, admin training, staff workflow.

### Phase 3: Expansion

- Referral from pilot restaurants.
- Partnerships with hospitality communities and menu/QR vendors.

## 14. Risks and Mitigations

| Risk                       | Impact | Mitigation                                                                |
| -------------------------- | ------ | ------------------------------------------------------------------------- |
| AI salah soal alergi/halal | High   | Confidence gate, verified flags, disclaimer, staff fallback               |
| Onboarding menu lambat     | High   | OCR-assisted import, manual review UI, spreadsheet import                 |
| Restoran tidak update menu | Medium | Simple admin UX, sold-out toggle, reminders                               |
| Latensi AI tinggi          | High   | Precompute translations, cache, streaming, smaller model for simple tasks |
| Biaya LLM naik             | Medium | Provider adapter, usage caps, prompt caching, precomputed menu knowledge  |
| WhatsApp/API dependency    | Medium | Staff inbox internal first, WhatsApp optional                             |
| Adopsi rendah              | High   | Pilot scripts, QR placement, staff training, measurable ROI dashboard     |
| Privacy/compliance         | Medium | Data minimization, retention policy, consent for optional data            |

## 15. Roadmap

### Month 0-1: Validation and Design

- Finalize personas, flows, design system, and clickable prototype.
- Validate 10 real menus and 5 staff workflows.

### Month 1-2: Frontend MVP

- Build customer PWA, menu UI, chat shell, preference filters, staff request UI, and admin dashboard mock/data-driven views.

### Month 2-3: Backend MVP

- Supabase schema, auth, RLS, storage, menu CRUD, table QR, session tracking, feedback, and staff inbox.

### Month 3-4: AI MVP

- Menu ingestion, embeddings, RAG answer API, guardrails, prompt versions, and AI logs.

### Month 4-5: Pilot

- Run 3-5 alpha restaurants.
- Fix onboarding, latency, trust, and staff workflow issues.

### Month 5-8: Expansion

- Expand to 10-30 restaurants only if usage and retention signals are healthy.

## 16. Open Questions

- Which restaurant segment has the strongest willingness to pay: casual dining, beach clubs, hotel restaurants, cafes, or premium restaurants?
- Do customers prefer menu browsing first or chat first?
- Which languages matter most in the first pilot locations?
- How much menu data can be verified by restaurant staff without friction?
- Should WhatsApp be part of MVP or should internal staff inbox be enough?
- What pricing matches owner willingness to pay after pilot?
