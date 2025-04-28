import { z } from "zod";

export const env = z
  .object({
    VITE_API_URL: z.string().url(),
  })
  .parse(import.meta.env);
