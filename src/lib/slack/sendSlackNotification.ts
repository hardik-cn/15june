// src/lib/slack/sendSlackNotification.ts

type SlackUserPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
};

export async function sendSlackNotification(
    user: SlackUserPayload | null | undefined
) {
    if (!user) {
        console.warn("sendSlackNotification: user payload is undefined or null");
        return;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured");
        return;
    }

    try {
        const blocks: object[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "New User Registered",
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
            // Row 2: Phone (single)
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Phone:*\n${user.countryCode} ${user.phone}` },
                ],
            },
            { type: "divider" },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Cantech Network • New Registration • ${new Date().toLocaleString()}`,
                    },
                ],
            },
        ];

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