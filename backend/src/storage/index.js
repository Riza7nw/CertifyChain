// src/storage/index.js
// Factory: pilih provider penyimpanan berdasarkan env STORAGE_PROVIDER.
// Sisa aplikasi cukup `require("../storage")` dan memanggil .add() / .gatewayUrl().

const config = require("../config");

function pickProvider() {
  switch (config.storage.provider) {
    case "ipfs":
    case "pinata":
      return require("./ipfsProvider");
    case "local":
    default:
      return require("./localProvider");
  }
}

module.exports = pickProvider();
