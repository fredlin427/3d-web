import { prisma } from "./prisma";

interface CreateAuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  staffName: string;
  details?: string;
}

export async function createAuditLog({
  entityType,
  entityId,
  action,
  staffName,
  details,
}: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      staffName,
      details,
    },
  });
}
