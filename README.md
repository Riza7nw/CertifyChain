# CertifyChain

Platform penerbitan & verifikasi sertifikat berbasis blockchain. Sertifikat di-anchor
di smart contract (Ethereum/EVM), file disimpan di IPFS, dan verifikasi bersifat publik
serta trustless — file & PII disimpan off-chain, hanya hash + CID yang on-chain.

## Monorepo

```
certifychain/
├── contracts/      Smart contract (Solidity, Hardhat, OpenZeppelin)
│   └── CertifyChainMultiInstitution.sol   # kontrak aktif (multi-institusi, V3)
├── scripts/        Script deploy (deployV3.js)
├── test/           Unit test kontrak (Hardhat + Chai)
├── backend/        API Node.js/Express + indexer + read-model DB + IPFS
│   └── ARCHITECTURE.md   # arsitektur backend (write/read path, IPFS, indexer)
└── frontend/       Dashboard React (Vite + Tailwind)
```

## Tech stack
- **Smart contract:** Solidity 0.8.24, Hardhat, OpenZeppelin 5 (AccessControl + Pausable)
- **Backend:** Node + Express, ethers v6, node:sqlite (read-model), IPFS (multiformats), JWT + bcrypt
- **Frontend:** Vite + React 18 + Tailwind, react-router, html5-qrcode

## Kontrak ter-deploy
- **Arbitrum Sepolia (aktif)** — `CertifyChainMultiInstitution`: **`0xf4F22FDc42ab2F256489B450C2F5D8A2aA7C9242`** (chainId 421614, blok deploy 329468013)
- Ethereum Sepolia (lama, tidak dipakai lagi): `0x1Ad005E16516AB7F5f3C3DF4751F86a890b8bBF3` (chainId 11155111)

## Menjalankan (development)

```bash
# 1. Smart contract — test
npm install
npm test                       # hardhat test (tanpa perlu .env)

# 2. Deploy ke Arbitrum Sepolia (butuh PRIVATE_KEY + saldo ETH Arbitrum Sepolia; lihat .env.example)
npx hardhat run scripts/deployV3.js --network arbitrumSepolia

# 3. Backend (lihat backend/.env.example)
cd backend && npm install && npm run dev      # API
cd backend && npm run indexer                 # indexer (terminal terpisah)

# 4. Frontend (lihat frontend/.env.example)
cd frontend && npm install && npm run dev
```

## Konfigurasi
Setiap layer punya `.env.example` sendiri (root untuk Hardhat, `backend/`, `frontend/`).
Salin jadi `.env` dan isi. **Jangan pernah commit `.env`** — sudah diabaikan via `.gitignore`.

## Dokumentasi lanjutan
- Arsitektur backend & alur data: [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)
- API & security: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
