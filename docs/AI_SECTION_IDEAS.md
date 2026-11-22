# Section AI di homepage chaniago.me: brief dan ide

Dokumen ini berdiri sendiri. Tujuannya: membahas arah section baru dengan model lain tanpa perlu membaca riwayat percakapan. Belum ada yang dipasang di homepage.

## Konteks

- **Situs:** `chaniago.me`, portfolio pribadi Chaniago, founder Chaniago Labs (Surabaya). Studio ini membangun website, aplikasi, sistem AI, dan otomasi.
- **Pembaca:** calon klien, dan tim penilai program startup. Mereka harus menangkap bahwa AI dipakai dengan baik di startup ini dan menghasilkan karya nyata yang dibutuhkan klien.
- **Posisi section:** setelah peta Indonesia, sebelum penutup "Have an idea? Let's make it real."
- **Urutan homepage sekarang:** Hero → Blueprint meja kerja → Labs (`busywork.` → `work.`, lalu `SEND → SYNC → DONE`) → Narasi dan starburst → bintang membentuk globe → globe menjadi peta Indonesia dengan penanda Surabaya → section baru ini → "Have an idea?" dan footer.

## Material visual yang sudah ada

- Globe dan peta dibangun dari satu kumpulan titik (24.576 titik, tiap titik punya ID tetap). Titik yang sama bisa digerakkan ke bentuk baru, dan scroll balik mengembalikannya.
- Titik merah Surabaya (`#a01838`) adalah satu-satunya aksen warna di bagian ini.
- Latar putih, tinta hampir hitam.
- Font: Google Sans Flex (lebar huruf bisa berubah lewat axis `wdth`) dan Space Grotesk untuk judul besar.
- Semua animasi mengikuti scroll, bisa dibalik, dan berhenti saat scroll berhenti.

## Batasan dari Chaniago

1. Topik: cara Chaniago Labs memakai AI. Umum, bukan studi kasus satu industri.
2. Jangan sebut nama tool atau program apa pun. Jangan terkesan meminta sponsor.
3. Kesan yang dituju: AI benar-benar dipakai dengan baik dan menghasilkan karya nyata untuk klien.
4. Visual premium dengan banyak white space.
5. Tetap ada efek tipografi dan animasi scroll.
6. Memakai material titik yang sama dengan globe dan peta.
7. Harus jalan di HP (320 px ke atas), reduced motion, dan tetap ringan.
8. Proyek boleh muncul sebagai tautan, bukan tokoh utama.

## Arah yang sudah ditolak

| Arah | Isi | Tanggapan Chaniago |
| --- | --- | --- |
| Tenun | Titik peta terurai jadi benang lalu menenun kain. Judul `DRAFT.` berubah jadi `CRAFT.` | "Jelek." Prototipe dibuat, ditolak. |
| Voice note → menu | Titik membentuk gelombang suara, lalu menu hari ini | Terlalu spesifik ke satu produk. Diminta umum. |
| "I use AI to …" | Ujung kalimat berganti tiga kali dari partikel | Tidak dilanjutkan; arah berubah ke tujuan section. |
| Permintaan kredit eksplisit | Judul yang menyebut program startup | Ditolak: jangan terang-terangan minta sponsor, jangan sebut nama tool. |
| Fieldwork | Pembuka "Show me how you do it today." Titik peta membentuk tulisan besar "What got easier?" | "Ga suka." Prototipe dibuat, ditolak. Diminta lebih premium dan lebih lega. |

Pola dari dua prototipe yang ditolak: titik dipakai untuk membentuk gambar atau huruf besar, hasilnya ramai dan berbutir. Ini pembacaan saya, bukan pernyataan Chaniago.

## Ide A (pilihan saya): "More room"

White space menjadi isi ceritanya. AI mengambil kerja berulang, halaman makin lega, dan huruf ikut melebar.

**Urutan scroll**

1. **Peta → baris padat.** Titik-titik Indonesia merapat jadi belasan baris tipis selebar layar, seperti halaman penuh catatan. Judul terjepit di tengahnya, hurufnya sempit dan rapat.
2. **Scroll mengosongkan halaman.** Baris titik surut satu per satu ke tepi kiri. Tiap baris hilang, judul mendapat ruang: huruf melebar (axis `wdth`) dan jarak antarhuruf membuka.
3. **Akhir: hampir kosong.** Sekitar 80% layar putih. Tersisa satu kalimat besar, dan titik merah Surabaya menjadi titik di akhir kalimat. Paragraf kecil naik dari balik garis dasar, baris demi baris.
4. **Keluar.** Scroll lanjut ke "Have an idea?". Scroll balik mengisi halaman lagi lewat jalur yang sama.

**Copy**

> **More room for the work that matters.**
>
> At Chaniago Labs, AI handles the first pass: the scaffolding, the test runs, the third rewrite. That leaves my time for what clients hire me for: understanding the problem, and getting the details right before it ships.
>
> *See selected work ↗*

**Kenapa ini**

- Efek hurufnya menyampaikan pesannya: huruf benar-benar mendapat ruang.
- Titik tidak membentuk gambar. Titik pergi, dan yang tersisa ruang kosong dengan tipografi bersih.
- Menyambung ke section Labs, yang sudah bercerita soal memotong busywork.

**Risiko**

- Tahap 1 (baris padat) bisa terlihat ramai seperti prototipe yang ditolak. Harus singkat dan tipis.
- Perubahan lebar huruf menggeser tata letak. Perlu dicek di 320 px dan di Safari.
- Di HP, 80% layar kosong bisa terasa seperti halaman belum selesai dimuat.

## Ide B: "One line"

Lebih hening, hampir tanpa partikel.

**Urutan scroll**

1. Semua titik peta jatuh menjadi satu garis tipis horizontal di tengah layar.
2. Tiga kata muncul bergantian dari balik garis itu, satu per scroll: `Idea.` → `Prototype.` → `In your hands.`
3. Garis memendek menjadi titik merah, lalu masuk ke "Have an idea?".

**Copy pendamping (kecil, di bawah garis)**

> At Chaniago Labs, AI gets an idea to a working prototype fast. The time that saves goes into testing it with the people who'll use it.

**Kenapa ini:** paling premium dan paling ringan. **Risiko:** pesan soal AI bergantung pada satu paragraf kecil, dan tiga kata itu bisa terbaca generik.

## Pertanyaan untuk dibahas

1. Mana yang lebih kuat untuk dua pembaca sekaligus (klien dan tim penilai): A atau B?
2. Apakah copy sudah menunjukkan AI dipakai dengan baik tanpa terdengar seperti klaim kosong? Perlu satu bukti konkret?
3. Apakah titik sebaiknya tetap terlihat di akhir section, atau cukup titik merah saja?
4. Ada arah ketiga yang tetap memenuhi delapan batasan di atas?

## Status

- Prototipe lama (ditolak) masih ada di lokal: `/studies/tenun` dan `/studies/fieldwork`. Keduanya tidak terhubung ke homepage.
- Ide A dan B belum dibuat.
- Belum ada yang di-deploy.

---

# Pengembangan & Penyempurnaan Ide (Untuk Review UI Designer)

Bagian ini mengembangkan draf di atas setelah mengecek struktur homepage `chaniago.me` saat ini (urutan chapter, copy section lain, shader `pointCloud`, transisi keluar peta, dan aturan di `MOBILE_GUIDE.md`). Teks asli di atas tidak diubah agar mudah dibandingkan.

## 1. Tiga temuan penting dari audit homepage saat ini

1. **Hindari tumpang tindih cerita dengan section Labs (`busywork.` → `work.`).**
   Section Labs dan `SEND → SYNC → DONE` sudah membahas bagaimana Chaniago Labs memangkas pekerjaan berulang *di operasional klien* (booking, antrean, meja kasir). Agar tidak terasa mengulang pesan yang sama, section baru ini sebaiknya fokus pada **dapur rekayasa Chaniago Labs**: bagaimana AI mempercepat proses eksplorasi dan pembangunan sistem, sementara keputusan arsitektur, batas keamanan, dan uji lapangan tetap dipegang manusia.
2. **Kontras ritme partikel antar-section mendukung akhir yang hampir kosong.**
   Urutan visual di sekitar section ini adalah: `ORIGIN` (24.576 titik peta Indonesia) → **Section AI ini** → `CONNECT` & Footer (partikel `AntigravityHalo` muncul kembali). Menjadikan akhir section ini sebagai "ruang putih hening" tanpa sisa kerumunan titik justru memberi jeda napas visual yang kuat sebelum masuk ke penutup.
3. **Transisi keluar peta Indonesia perlu disatukan.**
   Saat ini `AsciiGlobeSection` ditutup oleh sapuan karakter padat (`asciiSweep`). Jika section AI dipasang tepat setelah peta Indonesia, sapuan ASCII itu sebaiknya dilepas atau diganti serah-terima langsung lewat atribut `nextXY` yang sudah tersedia di `pointCloud.ts`. Jika keduanya jalan berurutan (peta → sapuan ASCII → formasi titik baru), transisinya akan kembali terasa ramai.

---

## 2. Jawaban langsung atas empat pertanyaan diskusi

### 1. Mana yang lebih kuat untuk klien sekaligus tim penilai: A atau B?
**Ide A lebih kuat sebagai konsep utama, tetapi perlu meminjam disiplin garis tipis dari Ide B.**
- Di **Ide A**, bentuk visualnya *adalah* pesannya: saat partikel menyingkir, huruf benar-benar mendapat ruang. Ini segar dan tidak mengulang pola section lain.
- Di **Ide B**, urutan tiga kata (`Idea.` → `Prototype.` → `In your hands.`) terlalu dekat dengan struktur tiga langkah `SEND → SYNC → DONE` di section Labs, dan berisiko terdengar seperti jargon agensi umum. Namun, mekanisme Ide B (titik menyatu ke garis tipis lalu memendek jadi titik merah) adalah solusi paling elegan untuk menghilangkan risiko "ramai/berbutir" di Tahap 1 Ide A.

### 2. Apakah copy sudah cukup kuat, atau perlu bukti konkret?
Copy Ide A sudah tenang dan dewasa, tetapi frasa *"the scaffolding, the test runs, the third rewrite"* masih terdengar sedikit seperti developer solo yang memakai asisten coding biasa. Tim penilai program startup dan klien bisnis perlu menangkap **kematangan rekayasa produksi** tanpa harus membaca studi kasus satu industri.
- **Solusi tanpa menambah kartu proyek:** ganti detail prosesnya dengan artefak rekayasa yang nyata di semua proyek studio (prototipe yang bisa diuji pengguna asli, izin akses/permissions, penanganan gagal/failure states, dan serah-terima ke tim operasional).
- Tautan proyek tetap satu baris tenang di bawah (`See selected work ↗`), opsional ditemani keterangan kategori tipis tanpa menyebut satu klien pun.

### 3. Apakah titik tetap terlihat di akhir section, atau cukup titik merah saja?
**Cukup titik merah (`#a01838`) saja di area utama.**
Seluruh titik non-merah sebaiknya menyusut masuk ke garis dasar lalu terserap ke titik merah di akhir kalimat utama. Selain paling bersih dan premium, ini menjaga jeda visual sebelum partikel `AntigravityHalo` muncul lagi di footer. Pastikan judul utama **hanya terdiri dari satu kalimat (satu tanda titik)** agar titik merah Surabaya menjadi satu-satunya titik baca yang tegas, tidak bersaing dengan titik kalimat lain.

### 4. Apakah ada arah ketiga yang memenuhi semua 8 batasan?
Ada. Di bawah disertakan **Ide C ("First pass, final call")** yang menjaga layar tetap ~80% putih sejak awal scroll (tanpa tahap padat sama sekali) dengan memainkan kontras **dua kecepatan scroll dan dua proporsi huruf**: kecepatan draf AI vs. ketelitian keputusan akhir manusia.

---

## 3. Penyempurnaan Utama — Ide A Refined: "More room"

Menggabungkan cerita ruang kosong dari Ide A dengan presisi garis tunggal dari Ide B, sehingga tidak pernah ada fase layar penuh bintik.

### Koreografi scroll (4 tahap, sepenuhnya reversible)

1. **Tahap 1 (`0.00 – 0.22`) — Peta menyatu jadi garis registrasi tipis (bukan belasan baris catatan).**
   Alih-alih menyebar jadi belasan baris penuh layar yang berisiko tampak berbutir seperti buku tulis, 24.576 titik Indonesia merapat menjadi **4 sampai 6 garis horizontal sangat tipis** (hairline presisi dengan opasitas rendah `0.18–0.28`) yang mengapit judul utama di tengah layar. Huruf judul tampil agak rapat dan sempit (`wdth: 76`), tetapi sudah terbaca jelas dengan ruang putih luas di atas dan bawahnya.
2. **Tahap 2 (`0.22 – 0.62`) — Garis menyingkir, huruf bernapas.**
   Saat di-scroll, garis-garis pengapit atas dan bawah surut bersih ke tepi kiri satu per satu, menyisakan **satu garis dasar (baseline)** tepat di bawah judul. Seiring garis pengapit hilang, judul membuka lebar hurufnya secara halus (`wdth: 76 → 100`) dan sedikit melonggarkan `letter-spacing`. Baris kata dikunci (`2–3 baris tetap`) agar tidak ada kata yang melompat pindah baris di tengah animasi.
3. **Tahap 3 (`0.62 – 0.84`) — Garis dasar memendek menjadi titik merah Surabaya.**
   Garis dasar tunggal di bawah judul ditarik memendek dari kiri ke kanan, lalu mengunci tepat menjadi **titik merah (`#a01838`)** sebagai tanda titik di ujung kalimat judul. Bersamaan dengan terkuncinya titik merah, paragraf penjelas dan tautan karya naik halus dari balik mask garis dasar.
4. **Tahap 4 (`0.84 – 1.00`) — Ruang baca tenang & keluar ke "Have an idea?".**
   Sekitar 78–80% layar di desktop (dan 65–70% di mobile) berupa kertas putih bersih. Scroll berlanjut mulus ke `TaglineSection`; scroll balik menarik titik merah kembali menjadi garis dasar, garis pengapit, lalu peta Indonesia.

### Solusi agar ruang putih di HP tidak terasa "belum selesai dimuat"

Di layar sempit (`320 px – 430 px`), ruang putih kosong tampak rusak hanya jika **tidak punya jangkar tepi**. Solusinya tanpa mengurangi kesan lega:
- Pasang satu penanda mikro `ui-monospace` yang konsisten dengan bahasa visual `AsciiGlobeSection` dan `SpatialHud` di batas atas area baca (misalnya `CHANIAGO LABS · AI IN PRACTICE`, ukuran `10px`, tracking lebar, tinta pudar).
- Posisikan blok teks sedikit di atas tengah optik (`~42%` dari atas), sehingga pada state akhir **judul + titik merah + paragraf pendek + tautan `See selected work ↗` tampil utuh dalam satu layar HP** tanpa perlu menebak apakah masih ada konten yang gagal dimuat.

### Opsi penyempurnaan copy (Ide A Refined)

**Opsi A1 — Paling dekat dengan draf asli, diperkuat bukti rekayasa produksi (Rekomendasi)**

> **More room for the work that matters.**
>
> At Chaniago Labs, AI takes the first pass: scaffolding, test cases, and a working prototype early enough to try on real tasks. The time saved goes into what has to hold in production: permissions, failure states, and a clean handoff to the team running it.
>
> *See selected work ↗*

**Opsi A2 — Menunjukkan AI dipakai saat membangun sekaligus di dalam sistem yang dikirim**

> **More room for the work that has to hold.**
>
> At Chaniago Labs, AI speeds up the first build pass and powers the draft-and-triage layer inside the software we ship. Human judgment stays on the hard edges: system rules, failure cases, and tools a client’s team can run on day one.
>
> *See selected work ↗*

*(Catatan opsional untuk tautan bawah: jika ingin memberi petunjuk keluasan karya tanpa menonjolkan proyek, baris tautan bisa disertai keterangan tipis `See selected work ↗  ·  Agent ops, live retail, workflow systems` — tetap umum lintas industri.)*

---

## 4. Alternatif Arah Ketiga — Ide C: "First pass, final call"

Dirancang khusus jika setelah ditimbang, Tahap 1 pada Ide A masih dikhawatirkan terlalu dekat dengan kesan garis/partikel ramai. Di Ide C, **layar langsung ~80% putih sejak detik pertama**.

### Premis visual
Bukan menceritakan "halaman ramai yang dikosongkan", melainkan **kontras dua kecepatan kerja**: kecepatan mesin menyiapkan bangun awal vs. ketenangan manusia mengunci keputusan akhir.

### Koreografi scroll
1. **Peta → Lintasan cepat tunggal (`0.00 – 0.35`).**
   Titik-titik peta Indonesia tidak membentuk baris-baris statis, melainkan meluncur ringkas dalam satu sapuan tipis mendatar di tengah layar (seperti garis bidik/kalibrasi). Di atasnya muncul klausa pertama kalimat dalam huruf `Google Sans Flex` yang ramping (`wdth: 78`) dan tinta abu tenang (`#5a5e63`):
   `AI gets the first build running;`
2. **Kalibrasi & penguncian keputusan (`0.35 – 0.78`).**
   Gerak titik melambat tajam dan seluruh titik memadat dari dua arah menuju satu titik fokus, mengunci menjadi **titik merah (`#a01838`)** yang presisi. Tepat saat titik mengunci, klausa kedua muncul di bawahnya dalam lebar penuh (`wdth: 100`) dan tinta hitam pekat (`#0a0a0a`), diakhiri oleh titik merah tersebut:
   **`we make sure it holds.`**
3. **Bukti singkat & keluar (`0.78 – 1.00`).**
   Satu paragraf pendek dan tautan `See selected work ↗` terbuka tenang di bawah kalimat utama, lalu lanjut ke *"Have an idea?"*.

### Copy Ide C

> AI gets the first build running;
> **we make sure it holds.**
>
> At Chaniago Labs, AI compresses scaffolding, test runs, and early iterations from days into hours. We spend that margin with real users: checking edge cases, tightening permissions, and shipping software your team can run without hand-holding.
>
> *See selected work ↗*

### Kapan memilih Ide C dibanding Ide A Refined?
- Pilih **Ide A Refined** jika ingin efek variabel `wdth` menjadi bintang utama yang terasa puitis dan langsung dialami pembaca saat halaman melapang.
- Pilih **Ide C** jika ingin pesan yang paling tajam bagi tim penilai startup sekaligus klien teknis (kecepatan AI + akuntabilitas engineering), dengan jaminan nol keramaian partikel dari awal sampai akhir.

---

## 5. Ringkasan perbandingan untuk review

| Kriteria | Ide A (Draf Awal) | Ide B ("One line") | Ide A Refined (Rekomendasi 1) | Ide C ("First pass, final call") |
| --- | --- | --- | --- | --- |
| **Risiko terlihat ramai/berbutir** | Sedang–Tinggi di Tahap 1 (belasan baris titik) | Sangat rendah | Rendah (maks. 4–6 hairline tipis, cepat surut) | Sangat rendah (80% putih sejak awal) |
| **Kekuatan efek tipografi (`wdth`)** | Kuat, tapi rawan loncat baris jika tidak dikunci | Minim (hanya ganti 3 kata) | Kuat & stabil (baris dikunci, `wdth 76 → 100`) | Kontras terukur (`wdth 78` abu vs `wdth 100` hitam) |
| **Daya yakinkan ke klien & tim penilai** | Baik, copy agak personal | Lemah di judul (3 kata generik) | Kuat (bukti rekayasa produksi konkret) | Sangat kuat (kecepatan + kontrol kualitas) |
| **Pembeda dari section Labs** | Cukup dekat bila fokus ke "busywork" | Mirip pola 3 beat `SEND → SYNC → DONE` | Jelas (fokus dapur engineering studio) | Sangat jelas (kecepatan draf vs. sign-off) |
| **Kesiapan di layar 320 px** | Rawan terasa kosong/belum muat di akhir | Aman | Aman (dijangkar label mikro + komposisi utuh) | Aman & paling ringkas secara vertikal |

---

## 6. Catatan guardrail desain & teknis sebelum prototipe dibuat

Agar selaras dengan `docs/MOBILE_GUIDE.md` dan arsitektur `chaniago.me` saat ini:

1. **Kunci pemenggalan baris judul sejak ukuran 320 px.** Jangan biarkan kalimat judul melakukan *auto-wrap* saat `wdth` melebar, karena perpindahan kata antarbaris di tengah scroll merusak kehalusan animasi dan memicu *layout thrashing* di Safari iOS. Tentukan 2 atau 3 baris tetap dan ukur `clamp()` font pada kondisi `wdth: 100`.
2. **Siapkan degradasi halus untuk perangkat tier rendah.** Mengikuti pola `Home.module.css` (`data-perf-tier="low"` / WebKit mobile), jika interpolasi `font-variation-settings` per frame terasa berat di HP kelas bawah, animasikan pembukaan ruang lewat `transform` / `opacity` dengan posisi akhir `wdth: 100`.
3. **State langsung untuk `prefers-reduced-motion: reduce`.** Sama seperti `AsciiGlobeSection`, matikan perjalanan scroll ekstra (`height: auto` / `min-height: 100dvh`), langsung tampilkan komposisi akhir yang bersih dengan huruf `wdth: 100`, titik merah `#a01838` statis di akhir judul, paragraf, dan tautan yang langsung bisa diklik.
4. **Area sentuh tautan minimal `44 × 44 CSS px`.** Tautan `See selected work ↗` harus punya *hit area* vertikal yang lega dan menghormati `safe-area-inset-bottom`, serta membuka layer Projects yang sudah ada (`portfolio:request-section`) tanpa memutus posisi baca bila ditutup kembali.
5. **Satu kalimat judul = satu tanda titik.** Apa pun copy final yang dipilih bersama Chaniago, pastikan judul besar hanya memiliki satu tanda titik di paling akhir supaya transformasi garis menjadi titik merah `#a01838` punya satu momen fokus yang tak terbagi.

