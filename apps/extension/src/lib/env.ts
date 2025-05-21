import { z } from "zod/v3";

export const env = z
  .object({
    VITE_API_URL: z.string().url(),
  })
  .parse(import.meta.env);
