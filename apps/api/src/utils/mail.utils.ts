import dedent from "dedent";
import { Resend } from "resend";
import { env } from "./env.utils.js";

export const resend = new Resend(env.RESEND_API_KEY);

export function sendOtp({ to, code }: { to: string; code: string }) {
	return resend.emails.send({
		from: "no-reply@getgrinta.com",
		to,
		subject: "Grinta sign in code",
		html: dedent`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Grinta Sign In Code</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f4f4f4; padding: 10px; text-align: center; }
                    .content { padding: 20px 0; }
                    .code { font-size: 24px; font-weight: bold; text-align: center; padding: 10px; background-color: #e9e9e9; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Grinta Sign In Code</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your sign in code for Grinta is:</p>
                        <div class="code">${code}</div>
                        <p>This code will expire in 5 minutes. If you didn't request this code, please ignore this email.</p>
                        <p>Best regards,<br>The Grinta Team</p>
                    </div>
                </div>
            </body>
            </html>
        `,
	});
}
