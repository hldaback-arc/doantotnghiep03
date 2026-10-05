import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );

export const profileSchema = z.object({
  fullName: optionalText(120),
  phone: optionalText(30),
  defaultLat: z.number().finite().min(-90).max(90).nullable().optional(),
  defaultLng: z.number().finite().min(-180).max(180).nullable().optional(),
  defaultAddress: optionalText(500),
}).refine(
  (profile) => profile.defaultLat === undefined || profile.defaultLng !== undefined,
  { message: "defaultLng is required when defaultLat is provided", path: ["defaultLng"] },
).refine(
  (profile) => profile.defaultLng === undefined || profile.defaultLat !== undefined,
  { message: "defaultLat is required when defaultLng is provided", path: ["defaultLat"] },
);