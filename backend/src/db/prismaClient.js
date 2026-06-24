// src/db/prismaClient.js
// Singleton PrismaClient (dipakai saat DB_DRIVER=postgres).
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
