import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  _prismaInstance: PrismaClient | undefined;
};

function getPrismaInstance(): PrismaClient {
  if (!globalForPrisma._prismaInstance) {
    globalForPrisma._prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma._prismaInstance;
}

// Proxy ensures PrismaClient is NEVER instantiated at import/build time.
// It only initializes when the first actual DB property is accessed at runtime.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaInstance() as any)[prop];
  },
});

