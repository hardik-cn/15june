import { z } from "zod";

export const setupAppSchema = z.object({
    tempToken: z.string().min(1),
});