const { PrismaClient } = require('@prisma/client');

// Reuse PrismaClient instance di serverless environment
const globalForPrisma = global;
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
