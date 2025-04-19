// server/src/db/client.ts
// Initializes and exports the singleton PrismaClient instance for ProjectOverride database interactions.

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient({
  // Optional: Configure logging
  // log: ['query', 'info', 'warn', 'error'],
});

// Export the singleton instance
export default prisma;

// Graceful shutdown handling
async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('Prisma Client disconnected.');
}

process.on('SIGINT', disconnectPrisma);
process.on('SIGTERM', disconnectPrisma);