// src/lib/slack/admin/kyc/approved/sendSlackNotification.ts

type SlackKYCApprovedPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    streetAddress: string;
    accountType: string;
    businessType?: string | null;
    companyName?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    approvedBy?: string | null;
};

export async function sendSlackNotification(
    user: SlackKYCApprovedPayload | null | undefined,
    title: string
) {
    if (!user) {
        console.warn("sendSlackNotification: user payload is undefined or null");
        return;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL not configured for KYC approval notification");
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
                    text: "KYC Approved - Account Verified",
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
                    { type: "mrkdwn", text: `*Phone:*\n${user.countryCode} ${user.phone}` },
                    { type: "mrkdwn", text: `*Account Type:*\n${user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1).toLowerCase()}` },
                ],
            },
        ];

        // Row 3: Business Type + Company Name (only if present)
        if (user.businessType || user.companyName) {
            blocks.push({
                type: "section",
                fields: [
                    ...(user.businessType
                        ? [{ type: "mrkdwn", text: `*Business Type:*\n${user.businessType}` }]
                        : []),
                    ...(user.companyName
                        ? [{ type: "mrkdwn", text: `*Company Name:*\n${user.companyName}` }]
                        : []),
                ],
            });
        }

        // Row 4: Approved By (only if present)
        // if (user.approvedBy) {
        //     blocks.push({
        //         type: "section",
        //         fields: [
        //             { type: "mrkdwn", text: `*Approved By:*\n${user.approvedBy}` },
        //         ],
        //     });
        // }

        // Address — last, full width, one line
        if (addressLine) {
            blocks.push({
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Address:*\n${addressLine}` },
                ],
            });
        }

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
                    text: `Cantech Network • KYC Approved • ${new Date().toLocaleString()}${user.approvedBy ? ` • Approved by ${user.approvedBy}` : ""
                        }`,
                },
            ],
        });

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // top-level blocks = full width
                blocks,
                // attachments only for the color bar (empty blocks)
                attachments: [
                    {
                        color: "#2eb67d",
                        fallback: "KYC Approved - Account Verified",
                    },
                ],
            }),
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