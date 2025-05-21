import { z } from "zod";

export const env = z
    .object({
        PUBLIC_API_URL: z.string().url(),
    })
    .parse(import.meta.env);
