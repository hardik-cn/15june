// src/lib/slack/admin/kyc/send_approval/sendSlackNotification.ts

type SlackKYCSendApprovalPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode?: string | null;
    accountType: string;
    companyName?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    streetAddress?: string | null;
    sentBy: string;
};

export async function sendSlackNotification(
    user: SlackKYCSendApprovalPayload | null | undefined,
    title: string
) {
    if (!user) {
        console.warn("sendSlackNotification: user payload is undefined or null");
        return;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured for KYC send approval notification");
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
                    text: title || "KYC In Review - Awaiting Admin Approval",
                    emoji: true,
                },
            },
            // Mention block
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `<@U0A6GAAS0AG>, KYC is in review and awaiting your approval.`,
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

        // Row 3: Company Name + Sent By
        const row3Fields: object[] = [];

        if (user.companyName) {
            row3Fields.push({
                type: "mrkdwn",
                text: `*Company Name:*\n${user.companyName}`
            });
        }

        if (row3Fields.length > 0) {
            blocks.push({ type: "section", fields: row3Fields });
        }

        // Address — last, one line, only if present
        if (addressLine) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Address:*\n${addressLine}` },
                ],
            });
        }

        blocks.push({ type: "divider" });

        // Context footer
        blocks.push({
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `Cantech Network • KYC Pending Approval • ${new Date().toLocaleString()} • Sent by ${user.sentBy}`,
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