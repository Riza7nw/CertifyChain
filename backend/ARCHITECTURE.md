# CertifyChain — Arsitektur Scalable

Dokumen ini menjelaskan arsitektur sistem setelah peningkatan ke skala besar:
multi-institusi, penyimpanan file via IPFS, dashboard institusi, dan statistik.

## Prinsip inti: pisahkan WRITE PATH dan READ PATH

Masalah skalabilitas utama di dApp: **membaca banyak data dari blockchain itu lambat & mahal**
(tidak ada query "ambil semua sertifikat institusi X"). Solusinya — pola yang dipakai The Graph:

```
                     WRITE PATH (sumber kebenaran)                  READ PATH (cepat, untuk UI)
  ┌────────┐  tx   ┌──────────────┐  event  ┌────────────┐  upsert  ┌──────────────┐  query  ┌─────────┐
  │  API   │ ───▶  │ Smart Contract│ ──────▶ │  Indexer   │ ───────▶ │  DB (read-   │ ◀────── │  API    │
  │ (write)│       │  (on-chain)   │         │ (listener) │          │   model)     │         │ (read)  │
  └───┬────┘       └──────────────┘         └────────────┘          └──────────────┘         └────┬────┘
      │ pin file                                                                                  │
      ▼                                                                                           ▼
  ┌────────┐                                                                              Dashboard & Statistik
  │  IPFS  │  (file PDF/gambar, di luar chain)                                            (tanpa menyentuh RPC)
  └────────┘
```

- **On-chain hanya menyimpan yang minimal & kritis**: `institutionId`, `dataHash` (bukti integritas), `fileCid` (pointer IPFS). File besar & PII tidak pernah masuk chain.
- **Indexer** mendengarkan event kontrak dan memproyeksikan ke **DB read-model**.
- **Dashboard & statistik** query ke DB — O(1)/indexed, tidak membebani node RPC dan tidak terpengaruh latensi blockchain.
- DB bisa hilang/dibangun ulang kapan saja dengan **re-index dari chain** (chain tetap sumber kebenaran).

## Komponen

| Komponen | Peran | Scale-out |
|---|---|---|
| **Smart contract V3** (`CertifyChainMultiInstitution`) | Sumber kebenaran. Role per-institusi, simpan CID. | L2 (Polygon/Base) untuk gas murah |
| **IPFS** | Simpan file sertifikat (content-addressed). | Pinning service (Pinata/web3.storage) + CDN gateway |
| **API (Express)** | Write (issue/register) + Read (dashboard/stats) + verify. | Stateless → horizontal scaling di belakang load balancer |
| **Indexer** | Event chain → DB. Proses terpisah, resume via `lastBlock`. | Worker terpisah, di-scale/di-restart independen |
| **DB read-model** | Query cepat untuk dashboard & statistik. | Dev: SQLite (node:sqlite). Prod: PostgreSQL (+ read replica) |

## Struktur folder (backend)

```
backend/src/
├── abi/
│   └── CertifyChainMultiInstitution.json   # ABI V3
├── config/index.js                         # env: chain, JWT, DB, storage
├── storage/                                # === IPFS / file storage ===
│   ├── index.js                            # factory pilih provider (env STORAGE_PROVIDER)
│   ├── localProvider.js                    # dev: disk + CIDv1 asli (multiformats)
│   └── ipfsProvider.js                     # prod: Kubo daemon / Pinata (via fetch)
├── db/                                     # === READ-MODEL (scalable read path) ===
│   ├── index.js                            # buka DB (node:sqlite) + rakit repo
│   ├── schema.js                           # tabel: institutions, certificates, verifications, meta
│   └── repositories/
│       ├── institutions.repo.js
│       ├── certificates.repo.js            # listByInstitution (paginasi), issuedDaily
│       └── verifications.repo.js           # dailyCounts (statistik harian)
├── indexer/index.js                        # === INDEXER === event chain -> DB (npm run indexer)
├── services/
│   ├── blockchain.service.js               # ethers v6: write/read kontrak + decode error
│   ├── qr.service.js                       # QR code
│   └── audit.service.js                    # audit log
├── controllers/
│   ├── institution.controller.js           # register + dashboard (daftar sertifikat)
│   ├── certificate.controller.js           # issue (IPFS+chain+DB), verify (+log), detail
│   ├── stats.controller.js                 # statistik global & per-institusi
│   ├── file.controller.js                  # upload/serve file
│   └── auth.controller.js
├── routes/                                 # institution / certificate / stats / file / auth / audit
├── middlewares/                            # auth (JWT), rateLimit, errorHandler
├── app.js                                  # rakit Express
└── server.js                               # entry API
```

## Endpoint baru (scaling)

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/api/institutions` | admin | Daftarkan institusi (issuer account sendiri on-chain) |
| GET | `/api/institutions` | publik | Daftar institusi + jumlah sertifikat |
| GET | `/api/institutions/:id` | publik | Detail institusi |
| POST | `/api/institutions/:id/certificates` | admin | **Terbitkan**: upload file→IPFS, hash, on-chain, simpan read-model |
| GET | `/api/institutions/:id/certificates` | admin | **Dashboard**: semua sertifikat institusi (paginasi) |
| GET | `/api/institutions/:id/stats` | admin | Statistik per-institusi |
| GET | `/api/stats` | publik | Statistik global: total issued + verifikasi harian |
| POST | `/api/files` | admin | Pin file ke IPFS (mandiri) |
| GET | `/api/files/:cid` | publik | Ambil file (gateway lokal dev) |

## Multi-institusi (on-chain)

- `DEFAULT_ADMIN_ROLE` = **platform** (daftarkan institusi, pause).
- Tiap institusi `i` punya `institutionAdminRole(i)` & `issuerRole(i)` (diturunkan via `keccak256`).
- Admin institusi mengelola issuer-nya sendiri (`addIssuer`/`removeIssuer`) — **terisolasi** antar institusi (sudah diuji: admin B tak bisa menyentuh issuer A).
- Sertifikat menyimpan `institutionId` → semua query dashboard/statistik tersaring per institusi.

## Catatan produksi
- **Verifikasi tetap ke chain** (sumber kebenaran). Read-model hanya untuk listing/agregasi.
- Ganti SQLite → PostgreSQL: cukup ganti `src/db/index.js` (bentuk repo sama).
- Indexer sebaiknya pakai websocket provider (`contract.on`) bila tersedia; polling dipakai sebagai fallback yang andal.
- IPFS: gunakan pinning service agar file tetap tersedia + gateway ber-CDN.
