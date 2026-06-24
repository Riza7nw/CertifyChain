# CertifyChain Frontend

Dashboard SaaS untuk menerbitkan & memverifikasi sertifikat blockchain.
Dibangun dengan **React (Vite) + Tailwind CSS**, terhubung ke backend CertifyChain.

## Struktur
```
frontend/
├── index.html
├── vite.config.js          # + proxy /api ke backend (anti-CORS saat dev)
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx            # Entry + BrowserRouter
    ├── App.jsx             # Routing
    ├── index.css           # Tailwind + animasi
    ├── api/
    │   └── certificateApi.js   # Semua panggilan ke backend (1 sumber)
    ├── components/         # UI reusable
    │   ├── Layout.jsx      # Sidebar + header dashboard
    │   ├── Card.jsx  Button.jsx  Field.jsx
    │   ├── Alert.jsx  Spinner.jsx  CopyField.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── IssueCertificate.jsx
        └── VerifyCertificate.jsx
```

## Menjalankan
```bash
cd frontend
npm install
cp .env.example .env     # opsional; default sudah mengarah ke proxy /api
npm run dev              # buka http://localhost:5173
```

> Pastikan **backend** sudah berjalan di `http://localhost:3000`.
> Saat dev, request ke `/api/*` otomatis di-proxy ke backend (lihat `vite.config.js`) sehingga tidak ada masalah CORS.
> Untuk production, set `VITE_API_BASE_URL` ke URL backend penuh.

## Fitur
| Halaman | Login? | Keterangan |
|---|---|---|
| **Dashboard** (`/`) | dashboard | Ringkasan + pintasan ke fitur |
| **Issue Certificate** (`/issue`) | dashboard | Form recipientName / issuerName / data → *Issue Certificate*. Menampilkan **QR Code** (bisa diunduh), certificateId, link verifikasi, dataHash, txHash |
| **Verify Certificate** (`/verify`) | dashboard | Input certificateId → *Verify*. Badge VALID/TIDAK VALID + detail |
| **Scan QR** (`/scan`) | **publik** | Pindai QR via kamera / unggah gambar, atau ketik ID → arahkan ke halaman verifikasi |
| **Public Verify** (`/verify/:id`) | **publik** | Target QR Code. Auto-verifikasi ke blockchain + opsi **cek keaslian data** (cocokkan hash) |

### QR Code & keamanan
- **Library scan:** `html5-qrcode` (kamera live + scan dari file gambar), di-*lazy-load* agar bundle awal ringan.
- **Hash data:** `js-sha3` (keccak256) untuk fitur cek keaslian data di sisi client — identik dengan hash on-chain.
- QR hanya berisi **link verifikasi** (`/verify/:id`); sumber kebenaran tetap blockchain, jadi QR tidak bisa dipakai memalsukan sertifikat.

### Detail UX
- **Loading state**: tombol berubah jadi spinner + teks "Memproses…"; halaman verify menampilkan indikator "Mengambil data dari blockchain…".
- **Error handling**: error backend (mis. `CERT_NOT_FOUND`, `NOT_OWNER`) maupun error koneksi ditampilkan lewat komponen `Alert`. Validasi input juga dilakukan di client sebelum hit API.
- **Alur terhubung**: setelah issue sukses, tombol "Verifikasi sertifikat ini" membawa certificateId langsung ke halaman verify (lewat query `?id=`) dan auto-verify.

## Catatan
- Semua pemanggilan API terpusat di `src/api/certificateApi.js` — mudah diganti base URL atau ditambah header auth nanti.
- Komponen UI (Button, Card, Alert, dst.) dipisah agar konsisten & reusable.
- Belum ada autentikasi; untuk produksi, endpoint issue sebaiknya dilindungi (mis. login admin + API key/JWT yang dikirim dari sini).
