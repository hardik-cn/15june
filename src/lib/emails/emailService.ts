import { db } from "@/lib/db";
import { transporter } from "@/lib/mailer";

export async function sendEmailWithTemplate({
  templateName,
  recipient,
  variables,
}: {
  templateName: string;
  recipient: string;
  variables: Record<string, string | number | boolean>;
}) {
  const template = await db.emailTemplate.findUnique({
    where: { slug: templateName },
  });

  if (!template) {
    console.error(`Email template "${templateName}" not found.`);
    return { success: false, error: `Template "${templateName}" not found.` };
  }

  let body = template.body;
  let subject = template.subject;

  // Replace dynamic variables {{variable}} or [[variable]]
  Object.entries(variables).forEach(([key, value]) => {
    const valString = String(value);
    // Replace {{key}}, [[key]], and similar mustache styles
    const regex = new RegExp(`(\\{\\{${key}\\}\\}|\\[\\[${key}\\]\\])`, "gi");
    body = body.replace(regex, valString);
    subject = subject.replace(regex, valString);
  });

  // Basic "from" fallback from env
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = "Cantech Network"; // You can make this dynamic if needed

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: subject,
      html: body,
      // text version could be extracted from body (stripped HTML) if needed
    });

    console.log(`Email sent successfully: ${info.messageId}`);

    await db.emailLog.create({
      data: {
        template: templateName,
        recipient: recipient,
        subject: subject,
        status: "sent",
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`Email delivery failed to ${recipient}:`, error);

    await db.emailLog.create({
      data: {
        template: templateName,
        recipient,
        subject,
        status: "failed",
        errorMessage: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

