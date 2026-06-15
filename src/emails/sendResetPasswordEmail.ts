import { transporter } from "@/lib/mailer";

export async function sendResetPasswordEmail(
    to: string,
    resetToken: string
) {
    const resetUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/forgot-password/reset?token=${resetToken}`;

    await transporter.sendMail({
        from: `"Cantech Network" <${process.env.SMTP_USER}>`,
        to,
        subject: "Reset Your Password",
        html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset.</p>

        <a href="${resetUrl}"
           style="background:#000;color:#fff;
           padding:12px 20px;
           text-decoration:none;
           border-radius:6px;">
           Reset Password
        </a>

        <p>If you didn't request this, ignore this email.</p>

        <p>${resetUrl}</p>
        `,
    });
}