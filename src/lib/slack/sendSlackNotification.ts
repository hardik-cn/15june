// src/lib/slack/sendSlackNotification.ts
type SlackUserPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
};

export async function sendSlackNotification(user: SlackUserPayload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured");
        return;
    }

    try {
        const payload = {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "New User Registered",
                        emoji: true,
                    },
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Name:*\n${user.firstName} ${user.lastName}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Email:*\n${user.email}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Phone:*\n${user.countryCode} ${user.phone}`,
                        },
                    ],
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Cantech Network • ${new Date().toLocaleString()}`,
                        },
                    ],
                },
            ],
        };

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Slack webhook failed: ${response.statusText}`);
        }

    } catch (error) {
        console.error("Slack notification error:", error);
    }
}