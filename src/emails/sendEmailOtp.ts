// src/lib/emails/sendEmailOtp.ts
import { transporter } from "@/lib/mailer";

export async function sendEmailOtp(
    to: string,
    otp: string
) {
    await transporter.sendMail({
        from: `"Cantech Network" <${process.env.SMTP_USER}>`,
        to,
        subject: "Cantech Network: Your Email Verification Code",
        html: `
            <!DOCTYPE html> <html> <head> <meta charset="UTF-8"> <title>Email Verification</title> </head> <body style="margin:0;padding:0;background:#f6f6f6;font-family:Calibri, Arial, sans-serif;"> <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:30px 0;"> <tr> <td align="center"> <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ddd;border-radius:10px;overflow:hidden;"> <!-- Header --> <tr> <td align="center" style="background:#000000;padding:20px;"> <img src="https://app.cantech.network/logo/logo-light.png" width="150" alt="Cantech Network Logo"> </td> </tr> <!-- Content --> <tr> <td style="padding:30px;text-align:center;color:#333;"> <h2 style="margin-top:0;color:#000;"> Email Verification </h2> <p> Use the verification code below to continue: </p> <div style=" display:inline-block; margin:20px 0; padding:15px 30px; background:#f5f5f5; border:2px dashed #000; border-radius:8px; font-size:32px; font-weight:bold; letter-spacing:6px; color:#000;"> ${otp} </div> <p style="color:#666;font-size:14px;"> This code expires in <strong>5 minutes</strong>. </p> <p style="color:#666;font-size:13px;margin-top:20px;"> If you did not request this code, you can safely ignore this email. </p> </td> </tr> </table> </td> </tr> </table> </body> </html>
        `,
    });
}