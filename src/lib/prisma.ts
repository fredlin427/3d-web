import { PrismaClient } from "@/generated/prisma/client";
import { PrismaSqlite } from "prisma-adapter-sqlite";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaSqlite({ url: "file:./dev.db" }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
