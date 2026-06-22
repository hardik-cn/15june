// src/lib/slack/admin/kyc/submission/sendKycSlackNotification.ts

type KycSlackPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode?: string | null;
    accountType: string;
    country: string;
    companyName?: string | null;
    businessType?: string | null;
    currency: string;
    streetAddress: string | null;
    city?: string | null;
    postalCode?: string | null;
};

export async function sendKycSlackNotification(
    data: KycSlackPayload | null | undefined
) {
    if (!data) {
        console.warn("sendKycSlackNotification: data payload is undefined or null");
        return;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured for KYC submission notification");
        return;
    }

    try {
        const addressLine = [
            data.streetAddress,
            data.city,
            data.country,
            data.postalCode,
        ]
            .filter(Boolean)
            .join(", ");

        const blocks: object[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "New KYC Submission",
                    emoji: true,
                },
            },
            // { type: "divider" },
            // Row 1: Customer + Email
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Name:*\n${data.firstName} ${data.lastName}` },
                    { type: "mrkdwn", text: `*Email:*\n${data.email}` },
                ],
            },
            // Row 2: Phone + Country
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Phone:*\n${data.countryCode ? data.countryCode + " " : ""}${data.phone}` },
                    // { type: "mrkdwn", text: `*Country:*\n${data.country}` },
                    { type: "mrkdwn", text: `*Account Type:*\n${data.accountType}` },
                ],
            },
            // Row 3: Account Type + Currency
            {
                type: "section",
                fields: [
                    // { type: "mrkdwn", text: `*Account Type:*\n${data.accountType}` },
                    { type: "mrkdwn", text: `*Currency:*\n${data.currency}` },
                ],
            },
        ];

        // Row 4: Company Name + Business Type (only if present)
        if (data.companyName) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Company:*\n${data.companyName}` },
                    { type: "mrkdwn", text: `*Business Type:*\n${data.businessType ?? "-"}` },
                ],
            });
        }

        // Address — last, full width, one line
        if (addressLine) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Address:*\n${addressLine}` },
                ],
            });
        }

        blocks.push(
            { type: "divider" },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Cantech Network • New KYC Submission • ${new Date().toLocaleString()}`,
                    },
                ],
            }
        );

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
        console.error("KYC Slack notification error:", error);
    }
}