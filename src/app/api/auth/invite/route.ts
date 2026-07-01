import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { encrypt } from "@/lib/securePassword";
import { getISTDateWithOffset } from "@/lib/getISTDate";


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fullName, email, password, inviteId } = body;

        if (!fullName || !email || !password || !inviteId) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Validate inviteId exists and not yet accepted
        const invitation = await db.userInvitation.findUnique({
            where: { uuidToken: inviteId }
        });

        if (!invitation) {
            return NextResponse.json(
                { error: "Invalid invitation token" },
                { status: 400 }
            );
        }

        if (invitation.acceptedAt) {
            return NextResponse.json(
                { error: "Invitation has already been accepted" },
                { status: 400 }
            );
        }

        if (invitation.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
            return NextResponse.json(
                { error: "Email address does not match invitation email" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "A user with this email address already exists" },
                { status: 400 }
            );
        }

        // Split fullName into firstName and lastName
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Hash and encrypt password
        const passwordHash = await bcrypt.hash(password, 12);
        const encryptedPassword = encrypt(password);

        // DB Transaction
        const result = await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    firstName: firstName,
                    lastName: lastName,
                    phone: "",
                    countryCode: "",
                    email: email.toLowerCase().trim(),
                    passwordHash: await bcrypt.hash(password, 12),
                    // isPhoneVerified: 1,
                    // isEmailVerified: 1,
                    lockStatus: encryptedPassword,
                    // whmcsClientId: invitation.whmcsClientId,
                    createdAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                }
            });

            const onboarding = await tx.onboarding.create({
                data: {
                    uuid: uuidv4(),
                    userId: user.id,
                    whmcsClientId: invitation.whmcsClientId,
                    createdAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                }
            });

            // Mark invitation as accepted
            await tx.userInvitation.update({
                where: { id: invitation.id },
                data: {
                    acceptedAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                }
            });

            return { user, onboarding };
        });

        return NextResponse.json({
            success: true,
            onboardingUuid: result.onboarding.uuid
        });
    } catch (err) {
        console.error("Invite register error:", err);
        return NextResponse.json(
            { error: "Failed to process invitation registration" },
            { status: 500 }
        );
    }
}
