const { PrismaClient } = require('@prisma/client');

// Centralized Prisma client so we can pass datasource config in one place.
const clientOptions = {};
if (process.env.DATABASE_URL) {
  clientOptions.datasources = { db: { url: process.env.DATABASE_URL } };
}

const prisma = new PrismaClient(clientOptions);

module.exports = prisma;
