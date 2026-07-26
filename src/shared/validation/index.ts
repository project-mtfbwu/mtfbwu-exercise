import { z } from "zod";

/** Shared validation helpers — domain schemas arrive with feature increments. */
export const uuidSchema = z.string().uuid();
export const nonEmptyStringSchema = z.string().trim().min(1);
