import { Resend } from "resend";
import { env } from "./env.utils";

export const resend = new Resend(env.RESEND_API_KEY);
