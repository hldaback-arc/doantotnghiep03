import { prisma } from "@/lib/prisma";

export async function getProfileByUser(userId: string) {
  return prisma.profiles.findUnique({ where: { user_id: userId } });
}

export async function saveProfileForUser(
  userId: string,
  input: {
    fullName?: string;
    phone?: string;
    defaultLat?: number | null;
    defaultLng?: number | null;
    defaultAddress?: string;
  },
) {
  const data = {
    ...(input.fullName !== undefined ? { full_name: input.fullName || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
    ...(input.defaultLat !== undefined ? { default_lat: input.defaultLat } : {}),
    ...(input.defaultLng !== undefined ? { default_lng: input.defaultLng } : {}),
    ...(input.defaultAddress !== undefined ? { default_address: input.defaultAddress || null } : {}),
  };

  return prisma.profiles.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...data },
    update: data,
  });
}

export async function listCategoriesForUser(userId: string, type?: "INCOME" | "EXPENSE") {
  return prisma.categories.findMany({
    where: {
      active: true,
      deleted_at: null,
      ...(type ? { type } : {}),
      OR: [{ user_id: null }, { user_id: userId }],
    },
    orderBy: [{ user_id: "asc" }, { name: "asc" }],
  });
}

export async function createCategoryForUser(
  userId: string,
  input: { name: string; type: "INCOME" | "EXPENSE" },
) {
  return prisma.categories.create({
    data: { user_id: userId, name: input.name, type: input.type },
  });
}

export async function updateCategoryForUser(userId: string, id: string, name: string) {
  const result = await prisma.categories.updateMany({
    where: { id, user_id: userId, deleted_at: null },
    data: { name },
  });
  if (!result.count) return null;
  return prisma.categories.findUnique({ where: { id } });
}

export async function deleteCategoryForUser(userId: string, id: string) {
  return prisma.categories.updateMany({
    where: { id, user_id: userId, deleted_at: null },
    data: { active: false, deleted_at: new Date() },
  });
}