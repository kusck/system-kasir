const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

let prisma;

if (!global._prisma) {
  global._prisma = new PrismaClient();
}

prisma = global._prisma;

module.exports = prisma;
