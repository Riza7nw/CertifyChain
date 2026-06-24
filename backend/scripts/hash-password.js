// scripts/hash-password.js
// Membuat bcrypt hash dari password admin untuk disimpan di .env (ADMIN_PASSWORD_HASH).
// Pemakaian:
//   npm run hash-password -- "passwordRahasiaAnda"
//   atau: node scripts/hash-password.js "passwordRahasiaAnda"

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error('Pemakaian: npm run hash-password -- "passwordAnda"');
  process.exit(1);
}

const SALT_ROUNDS = 10;
const hash = bcrypt.hashSync(password, SALT_ROUNDS);

console.log("\nSalin baris berikut ke file .env Anda:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
