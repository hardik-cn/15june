// src/app/api/verify/digilocker/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashfreeClient } from "@/lib/cashfree";

interface AddressData {
    house?: string;
    street?: string;
    landmark?: string;
    locality?: string;
    vtc?: string;
    subdist?: string;
    dist?: string;
    state?: string;
    country?: string;
    pincode?: string;
}

export async function GET(req: NextRequest) {
    try {
        const verificationId = req.nextUrl.searchParams.get("id");
        const token = req.nextUrl.searchParams.get("token");

        if (!verificationId || !token) {
            return NextResponse.json(
                { error: "Invalid request" },
                { status: 400 }
            );
        }

        const record = await db.verificationDocument.findFirst({
            where: {
                cashfreeRefId: verificationId,
                verificationToken: token,
            },
        });

        if (!record) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (
            record.verificationTokenExpiresAt &&
            record.verificationTokenExpiresAt < new Date()
        ) {
            return NextResponse.json(
                { error: "Token expired" },
                { status: 401 }
            );
        }

        /*
        ─────────────────────────────────────
        Get verification status from Cashfree
        ─────────────────────────────────────
        */

        const statusResult =
            await cashfreeClient.getDigiLockerStatus(verificationId);

        console.log("DigiLocker status result:", {
            verificationId,
            status: statusResult.status,
        });

        // Still pending
        if (
            statusResult.status === "PENDING" ||
            statusResult.status === "INITIATED"
        ) {
            return NextResponse.json({
                success: true,
                status: "PENDING",
            });
        }

        /*
        ─────────────────────────────────────
        Failed / consent denied
        ─────────────────────────────────────
        */

        if (
            statusResult.status === "CONSENT_DENIED" ||
            statusResult.status === "FAILED"
        ) {
            await db.verificationDocument.updateMany({
                where: {
                    cashfreeRefId: verificationId,
                    userId: record.userId,
                },
                data: {
                    verificationStatus: "failed",
                    rawResponse: statusResult as any,
                },
            });

            return NextResponse.json({
                success: false,
                status: statusResult.status,
            });
        }

        /*
        ─────────────────────────────────────
        AUTHENTICATED → fetch document
        ─────────────────────────────────────
        */

        if (statusResult.status === "AUTHENTICATED") {
            try {
                const documentResult =
                    await cashfreeClient.getDigiLockerDocument(verificationId);

                const addressData: AddressData =
                    documentResult.split_address || {};

                /*
                Update verification record
                */

                await db.verificationDocument.updateMany({
                    where: {
                        cashfreeRefId: verificationId,
                        userId: record.userId,
                    },
                    data: {
                        verificationStatus: "success",
                        extractedData: documentResult as any,
                        verifiedAt: new Date(),
                    },
                });

                await db.verificationDocument.updateMany({
                    where: {
                        cashfreeRefId: verificationId,
                    },
                    data: {
                        verificationToken: null,
                    },
                });

                /*
                Update KYC profile
                */
                const kycProfile = await db.kycProfile.findUnique({
                    where: { userId: record.userId },
                });

                if (kycProfile) {
                    await db.kycProfile.update({
                        where: { id: kycProfile.id },
                        data: {
                            aadharVerified: true,
                            streetAddress:
                                kycProfile.streetAddress ||
                                [
                                    addressData.house,
                                    addressData.street,
                                    addressData.landmark,
                                    addressData.locality,
                                ]
                                    .filter(Boolean)
                                    .join(", "),
                            city:
                                kycProfile.city ||
                                addressData.vtc ||
                                addressData.dist,
                            state: kycProfile.state || addressData.state,
                            postalCode:
                                kycProfile.postalCode ||
                                addressData.pincode,
                        },
                    });

                    await db.verificationDocument.updateMany({
                        where: {
                            cashfreeRefId: verificationId,
                            userId: record.userId,
                        },
                        data: {
                            kycProfileId: kycProfile.id,
                        },
                    });
                }

                return NextResponse.json({
                    success: true,
                    status: "SUCCESS",
                    address: {
                        house: addressData.house || "",
                        street: addressData.street || "",
                        landmark: addressData.landmark || "",
                        locality: addressData.locality || "",
                        vtc: addressData.vtc || "",
                        dist: addressData.dist || "",
                        state: addressData.state || "",
                        pincode: addressData.pincode || "",
                    },
                });
            } catch (docError: any) {
                console.error("Error fetching DigiLocker document:", docError);

                return NextResponse.json({
                    success: false,
                    status: "PENDING",
                    message: "Document not yet available",
                });
            }
        }

        /*
        Default response
        */

        return NextResponse.json({
            success: true,
            status: statusResult.status || "PENDING",
        });

    } catch (error: any) {
        console.error("DigiLocker status check error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to check verification status",
            },
            { status: 500 }
        );
    }
}