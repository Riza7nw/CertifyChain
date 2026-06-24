# CertifyChain — Smart Contract Sertifikat Blockchain

Smart contract Solidity untuk menerbitkan & memverifikasi sertifikat di blockchain.
Data dokumen disimpan **off-chain**, sedangkan **hash**-nya di-anchor on-chain (hemat gas + privasi terjaga).

## Struktur
```
contracts/CertifyChain.sol   # Kontrak utama
test/CertifyChain.test.js    # Contoh unit test (Hardhat + Chai)
scripts/deploy.js            # Script deploy
```

## Fitur
| Fungsi | Akses | Keterangan |
|---|---|---|
| `issueCertificate` | onlyOwner | Menerbitkan sertifikat baru |
| `verifyCertificate` | publik | Cek sertifikat ada & masih aktif |
| `verifyCertificateWithHash` | publik | Verifikasi ketat (ID + hash dokumen) |
| `getCertificate` | publik | Ambil seluruh data sertifikat |
| `revokeCertificate` | onlyOwner | Mencabut sertifikat |
| `transferOwnership` | onlyOwner | Pindah kepemilikan |

Event: `CertificateIssued`, `CertificateRevoked`, `OwnershipTransferred`.

---

## A. Cara pakai di Remix (paling cepat)
1. Buka https://remix.ethereum.org
2. Buat file `CertifyChain.sol`, paste isi `contracts/CertifyChain.sol`.
3. Tab **Solidity Compiler** → pilih versi `0.8.24` (atau lebih baru) → **Compile**.
4. Tab **Deploy & Run** → Environment `Injected Provider - MetaMask` (untuk testnet Sepolia) atau `Remix VM` (untuk simulasi) → **Deploy**.
5. Test manual lewat panel kontrak:
   - `issueCertificate`: butuh `bytes32`. Untuk membuat ID/hash, pakai tombol `computeHash("CERT-2026-0001")` lalu salin hasilnya.
   - `verifyCertificate(id)` → harus `true`.
   - `getCertificate(id)` → menampilkan datanya.

## B. Cara pakai di Hardhat
```bash
# 1. Inisialisasi project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init      # pilih "Create an empty hardhat.config.js" lalu salin file di bawah

# 2. Letakkan file:
#    contracts/CertifyChain.sol, test/CertifyChain.test.js, scripts/deploy.js

# 3. Test
npx hardhat test

# 4. Deploy lokal
npx hardhat run scripts/deploy.js

# 5. Deploy ke testnet Sepolia (isi .env terlebih dulu)
npx hardhat run scripts/deploy.js --network sepolia
```

### Contoh `hardhat.config.js` untuk testnet
```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,        // mis. dari Alchemy/Infura
      accounts: [process.env.PRIVATE_KEY],     // private key wallet testnet
    },
  },
};
```

Buat file `.env`:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/XXXX
PRIVATE_KEY=0xprivatekey_wallet_testnet_anda
```

> ⚠️ Jangan pernah commit `.env` / private key asli ke repo publik.

## Catatan keamanan & desain
- **dataHash** sebaiknya dihitung dari file asli (mis. `sha256`/`keccak256` PDF) di sisi aplikasi, lalu dikirim ke kontrak.
- Penerbitan dibatasi `onlyOwner` untuk mencegah sertifikat palsu. Untuk multi-penerbit, owner bisa diganti pola role-based (mis. OpenZeppelin `AccessControl`).
- Sertifikat yang dicabut tetap tersimpan (audit trail), hanya statusnya `isValid = false`.
