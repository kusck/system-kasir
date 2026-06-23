const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global._prisma) {
  global._prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}

prisma = global._prisma;

module.exports = prisma;
