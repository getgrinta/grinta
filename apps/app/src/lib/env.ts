import { env as publicEnv } from "$env/dynamic/public";
import { z } from "zod/v3";

export const env = z
  .object({
    PUBLIC_API_URL: z.string().url(),
  })
  .parse(publicEnv);
