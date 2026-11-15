# CertifyChain Backend API

Backend Node.js + Express yang menghubungkan smart contract **CertifyChain** dengan aplikasi, memakai **ethers.js v6**.

## Struktur Project
```
backend/
├── src/
│   ├── abi/CertifyChainMultiInstitution.json  # ABI kontrak (V3)
│   ├── config/index.js                # Load & validasi .env
│   ├── controllers/
│   │   └── certificate.controller.js  # Handler request/response
│   ├── middlewares/errorHandler.js    # 404 & error handler global
│   ├── routes/certificate.routes.js   # Definisi endpoint
│   ├── services/blockchain.service.js # Integrasi ethers.js (inti)
│   ├── utils/                         # AppError, asyncHandler, hash
│   ├── app.js                         # Setup Express
│   └── server.js                      # Entry point
├── .env.example
└── package.json
```

> **Alur:** `routes` → `controllers` (validasi + format response) → `services` (bicara ke blockchain). Setiap lapisan punya satu tanggung jawab.

## Setup
```bash
cd backend
npm install
cp .env.example .env     # lalu isi RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
npm run dev              # mode development (auto-reload)
# atau
npm start
```

> ⚠️ Wallet di `PRIVATE_KEY` **harus owner kontrak**, kalau tidak `issue-certificate` akan ditolak (`NotOwner`). Wallet juga butuh saldo native (mis. Arbitrum Sepolia ETH) untuk bayar gas.

## Endpoint

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | Koneksi blockchain + apakah wallet backend ISSUER & status pause |
| POST | `/api/auth/login` | publik | Login admin → JWT (rate-limited) |
| POST | `/api/issue-certificate` | **admin (JWT)** | Terbitkan sertifikat (response berisi `qrCode` + `verificationUrl`) |
| GET | `/api/verify-certificate/:id` | publik | Verifikasi (true/false) |
| GET | `/api/certificate/:id` | publik | Detail lengkap (termasuk `issuedBy`) |
| GET | `/api/certificate/:id/qrcode` | publik | QR Code (PNG; `?format=dataurl` untuk JSON base64) |
| GET | `/api/audit` | **admin (JWT)** | Audit log penerbitan & login |

> QR Code dibuat dengan library **`qrcode`** (npm), berisi link verifikasi publik.

## Security layer
**Role:** `admin` (login JWT, boleh issue & lihat audit) vs **public verifier** (semua endpoint verify/get/qr — tanpa login).

**Setup auth:**
```bash
# 1. buat hash password admin
npm run hash-password -- "passwordRahasiaAnda"
# 2. salin hasilnya ke .env (ADMIN_PASSWORD_HASH=...), set juga ADMIN_USERNAME & JWT_SECRET
```

**Login & pakai token:**
```bash
# login -> dapat token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"passwordRahasiaAnda"}'

# pakai token untuk issue
curl -X POST http://localhost:3000/api/issue-certificate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"recipientName":"Budi","issuerName":"Univ X","data":"Sarjana TI 2026"}'
```

**Lapisan pertahanan yang dipasang:**
- **JWT** (`jsonwebtoken`) untuk autentikasi admin; password disimpan sebagai **bcrypt hash** (`bcryptjs`), bukan plaintext.
- **Otorisasi role** (`requireRole("admin")`) pada endpoint issue & audit.
- **Rate limiting** (`express-rate-limit`): login 10/15mnt (anti brute-force), issue 20/mnt.
- **Helmet** untuk security headers, body JSON dibatasi 100kb, `trust proxy` agar IP akurat.
- **Audit log** (`logs/audit.log`, JSONL): mencatat tiap penerbitan (admin, IP, certId, txHash) + login sukses/gagal.

> **Catatan:** sumber kebenaran & audit yang tak-terubah tetap di blockchain (event
> `CertificateIssued` + `issuedBy`). Audit file backend bersifat pelengkap operasional.

---

## Contoh Request (curl)

### 1. Terbitkan sertifikat
```bash
curl -X POST http://localhost:3000/api/issue-certificate \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "Budi Santoso",
    "issuerName": "Universitas Blockchain Indonesia",
    "data": "Sarjana Teknik Informatika - Cumlaude - 2026"
  }'
```
Contoh response:
```json
{
  "success": true,
  "message": "Sertifikat berhasil diterbitkan ke blockchain.",
  "data": {
    "certificateId": "0x9f2c...e1a4",
    "recipientName": "Budi Santoso",
    "issuerName": "Universitas Blockchain Indonesia",
    "dataHash": "0x4b7a...88c1",
    "transaction": {
      "txHash": "0xabc123...",
      "blockNumber": 5829134,
      "gasUsed": "118734"
    }
  }
}
```
> Simpan `certificateId` dari response — itu yang dipakai untuk verifikasi/detail.

### 2. Verifikasi sertifikat
```bash
curl http://localhost:3000/api/verify-certificate/0x9f2c...e1a4
```
```json
{
  "success": true,
  "data": {
    "certificateId": "0x9f2c...e1a4",
    "valid": true,
    "message": "Sertifikat ASLI dan masih aktif."
  }
}
```

### 3. Detail sertifikat
```bash
curl http://localhost:3000/api/certificate/0x9f2c...e1a4
```
```json
{
  "success": true,
  "data": {
    "certificateId": "0x9f2c...e1a4",
    "recipientName": "Budi Santoso",
    "issuerName": "Universitas Blockchain Indonesia",
    "dataHash": "0x4b7a...88c1",
    "timestamp": 1779580800,
    "issuedAt": "2026-06-23T08:00:00.000Z",
    "isValid": true
  }
}
```

## Contoh Postman
1. **POST** `http://localhost:3000/api/issue-certificate`
   - Body → raw → JSON:
     ```json
     { "recipientName": "Budi Santoso", "issuerName": "Universitas Blockchain Indonesia", "data": "Sarjana TI 2026" }
     ```
2. **GET** `http://localhost:3000/api/verify-certificate/{certificateId}`
3. **GET** `http://localhost:3000/api/certificate/{certificateId}`

## Format Error
Semua error konsisten:
```json
{
  "success": false,
  "error": { "code": "CERT_NOT_FOUND", "message": "Sertifikat tidak ditemukan di blockchain." }
}
```

| Code | HTTP | Penyebab |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field input kurang/salah tipe |
| `INVALID_ID` | 400 | Format certificateId bukan bytes32 |
| `NOT_OWNER` | 403 | Wallet backend bukan owner kontrak |
| `CERT_NOT_FOUND` | 404 | Sertifikat tidak ada |
| `CERT_EXISTS` | 409 | certificateId sudah dipakai |
| `INSUFFICIENT_FUNDS` | 402 | Saldo gas tidak cukup |
| `RPC_ERROR` | 502 | Gagal konek node blockchain |

## Catatan
- `dataHash` dihitung dengan `keccak256` (`ethers.id`) — konsisten dengan `computeHash` di kontrak.
- `certificateId` di-generate acak (32 byte) agar unik; bisa juga dikirim manual lewat body `certificateId` (harus bytes32 hex).
- Untuk produksi, pertimbangkan: rate limiting, autentikasi (API key/JWT) pada `issue-certificate`, dan antrian transaksi (nonce management) bila volume tinggi.
