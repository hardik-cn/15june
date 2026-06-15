type KycSlackPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode?: string;
    accountType: string;
    country: string;
    companyName?: string | null;
    businessType?: string | null;
    currency: string;
};

export async function sendKycSlackNotification(
    data: KycSlackPayload
) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured");
        return;
    }

    try {
        const payload = {
            attachments: [
                {
                    color: "#dc2626", // red-600

                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: "🚨 New KYC Submission",
                                emoji: true,
                            },
                        },

                        {
                            type: "section",
                            fields: [
                                {
                                    type: "mrkdwn",
                                    text: `*Customer:*\n${data.firstName} ${data.lastName}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Email:*\n${data.email}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Phone:*\n${data.countryCode ?? ""} ${data.phone}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Country:*\n${data.country}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Account Type:*\n${data.accountType}`,
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Currency:*\n${data.currency}`,
                                },
                            ],
                        },

                        ...(data.companyName
                            ? [
                                {
                                    type: "section",
                                    fields: [
                                        {
                                            type: "mrkdwn",
                                            text: `*Company:*\n${data.companyName}`,
                                        },
                                        {
                                            type: "mrkdwn",
                                            text: `*Business Type:*\n${data.businessType ?? "-"}`,
                                        },
                                    ],
                                },
                            ]
                            : []),

                        {
                            type: "divider",
                        },

                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: `Cantech Networks • ${new Date().toLocaleString()}`,
                                },
                            ],
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
            throw new Error(
                `Slack webhook failed: ${response.statusText}`
            );
        }
    } catch (error) {
        console.error(
            "KYC Slack notification error:",
            error
        );
    }
}