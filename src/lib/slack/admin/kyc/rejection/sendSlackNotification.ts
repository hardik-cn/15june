// src/lib/slack/admin/kyc/rejection/sendSlackNotification.ts

type SlackKYCRejectionPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode?: string | null;
    accountType: string;
    companyName?: string | null;
    streetAddress?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    rejectionReason: string;
    rejectedBy: string;
};

export async function sendSlackNotification(
    user: SlackKYCRejectionPayload | null | undefined,
    title: string
) {
    if (!user) {
        console.warn("sendSlackNotification: user payload is undefined or null");
        return;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured for KYC rejection notification");
        return;
    }

    try {
        const addressLine = [
            user.streetAddress,
            user.city,
            user.country,
            user.postalCode,
        ]
            .filter(Boolean)
            .join(", ");

        const blocks: object[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: title || "KYC Rejected – Incomplete Information ❌",
                    emoji: true,
                },
            },
            // Row 1: Name + Email
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Name:*\n${user.firstName} ${user.lastName}` },
                    { type: "mrkdwn", text: `*Email:*\n${user.email}` },
                ],
            },
            // Row 2: Phone + Account Type
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Phone:*\n${user.countryCode ? user.countryCode + " " : ""}${user.phone}`,
                    },
                    { type: "mrkdwn", text: `*Account Type:*\n${user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1).toLowerCase()}` },
                ],
            },
        ];

        // Row 3: Company Name
        if (user.companyName) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Company Name:*\n${user.companyName}` },
                ],
            });
        }

        // Location — last, one line, only if present
        if (addressLine) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Address:*\n${addressLine}` },
                ],
            });
        }

        // Rejection Reason — full width
        blocks.push(
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Rejection Reason:*\n${user.rejectionReason}`,
                },
            }
        );

        // divider
        blocks.push({
            type: "divider",
        });
        // Context footer
        blocks.push({
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `Cantech Network • KYC Rejected • ${new Date().toLocaleString()} • Rejected by ${user.rejectedBy}`,
                },
            ],
        });

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blocks }),
        });

        if (!response.ok) {
            const resText = await response.text();
            throw new Error(
                `Slack webhook failed: ${response.status} ${response.statusText} - ${resText}`
            );
        }
    } catch (error) {
        console.error("Slack notification error:", error);
    }
}