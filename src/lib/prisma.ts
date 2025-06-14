// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Declare a global variable `prisma` within the Node.js global scope.
// This is necessary to store the PrismaClient instance and reuse it across hot-reloads
// in development without creating new connections.
// The `var` keyword is used here because it correctly merges with the global `var` declarations.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize PrismaClient.
// We check if a 'prisma' instance already exists on the global object.
// If it does (which happens after the first hot-reload in development), we reuse it.
// Otherwise, we create a new PrismaClient instance.
const prisma = global.prisma || new PrismaClient();

// In development environments, we store the PrismaClient instance on the global object.
// This prevents the creation of multiple PrismaClient instances due to Next.js's
// fast refresh (hot-reloading) mechanism, which can lead to connection pool issues.
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;
