import { db } from "@/lib/db";
import { transporter } from "@/lib/mailer";
import { replaceVariables } from "./replaceVariables";

interface SendTemplateEmailProps {
    templateSlug: string;
    to: string;
    variables?: Record<string, string>;
}

export async function sendTemplateEmail({
    templateSlug,
    to,
    variables = {},
}: SendTemplateEmailProps) {

    const template = await db.emailTemplate.findFirst({
        where: {
            slug: templateSlug,
            status: "1",
        },
    });

    if (!template) {
        throw new Error(`Email template '${templateSlug}' not found`);
    }

    const finalSubject = replaceVariables(
        template.subject,
        variables
    );

    const finalBody = replaceVariables(
        template.body,
        variables
    );

    const info = await transporter.sendMail({
        from: `"Cantech Network" <${process.env.SMTP_USER}>`,
        to,
        subject: finalSubject,
        html: finalBody,
    });

    return info;
}