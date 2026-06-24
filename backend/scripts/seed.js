// scripts/seed.js
// Seed identity awal (idempotent). Memetakan admin tunggal lama -> PlatformAdmin,
// dan membuat Org default yang ditautkan ke institusi on-chain #1.
//   npm run seed
//
// PlatformAdmin memakai ADMIN_PASSWORD_HASH yang sudah ada -> login dengan
// password admin yang SAMA seperti sebelumnya (email = SEED_ADMIN_EMAIL).

require("dotenv").config();
const prisma = require("../src/db/prismaClient");
const config = require("../src/config");

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@certifychain.local";

  const user = await prisma.users.upsert({
    where: { email },
    update: { role: "admin", is_platform_admin: true, email_verified_at: new Date() },
    create: {
      email,
      password_hash: config.adminPasswordHash, // hash admin yang sudah ada
      name: "Platform Admin",
      role: "admin",
      is_platform_admin: true,
      email_verified_at: new Date(),
    },
  });

  const org = await prisma.organizations.upsert({
    where: { slug: "default-org" },
    update: { onchain_institution_id: 1 },
    create: { name: "Default Organization", slug: "default-org", onchain_institution_id: 1 },
  });

  await prisma.memberships.upsert({
    where: { user_id_organization_id: { user_id: user.id, organization_id: org.id } },
    update: { role: "OrgAdmin" },
    create: { user_id: user.id, organization_id: org.id, role: "OrgAdmin" },
  });

  console.log("Seed OK:");
  console.log(`  PlatformAdmin : ${email} (password = password admin yang sudah ada)`);
  console.log(`  Organisasi    : ${org.slug} (id=${org.id}) -> onchain_institution_id=${org.onchain_institution_id}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed gagal:", e.message);
  process.exit(1);
});
