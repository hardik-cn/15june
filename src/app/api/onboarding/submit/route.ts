// src/app/api/onboarding/submit/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { validateUploadFile, validateFileSignature } from "@/lib/validators/validateUpload";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { sendKycSlackNotification } from "@/lib/slack/sendKycSlackNotification";
import { z } from "zod";

const onboardingSubmitSchema = z.object({
    accountType: z.string().min(1, "Account type is required"),
    country: z.string().min(1, "Country is required"),
    state: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    streetAddress: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
    businessType: z.string().optional().nullable(),
    gstVerified: z.any().optional(),
    cinVerified: z.any().optional(),
    aadharVerified: z.any().optional(),
    billingCurrency: z.string().optional().nullable(),
    addressType: z.any().optional(),
    internationalVerified: z.any().optional(),
    representativeName: z.string().optional().nullable(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ── Parse multipart form data (supports both JSON and FormData) ────────
        const contentType = req.headers.get("content-type") || "";

        let body: any = {};
        let uploadedFiles: File[] = [];
        // let uploadedFiles: { file: File; documentType: string; label: string }[] = [];

        if (contentType.includes("multipart/form-data")) {

            const formData = await req.formData();

            const jsonData = formData.get("data");

            let rawString = "";

            if (typeof jsonData === "string") {
                rawString = jsonData;
            } else if (jsonData instanceof File) {
                rawString = await jsonData.text();
            } else {
                throw new Error("Invalid 'data' format");
            }

            try {
                console.log("Parsed JSON string:", rawString);
                body = JSON.parse(rawString);
            } catch (err) {
                console.error("JSON parse failed:", rawString);
                throw new Error("Invalid JSON format in 'data'");
            }

            const fileEntries = formData.getAll("documents");
            // const docTypes = formData.getAll("documentTypes");
            // const docLabels = formData.getAll("documentLabels");

            for (let i = 0; i < fileEntries.length; i++) {

                const file = fileEntries[i] as File;

                if (file && file.size > 0) {
                    uploadedFiles.push(file);
                    // uploadedFiles.push({
                    //     file,
                    //     documentType: (docTypes[i] as string) || "other",
                    //     label: (docLabels[i] as string) || "Document",
                    // });
                }
            }

        } else {
            body = await req.json();
        }

        const parsed = onboardingSubmitSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const {
            accountType,
            country,
            state,
            city,
            postalCode,
            streetAddress,
            companyName,
            businessType,
            gstVerified,
            cinVerified,
            aadharVerified,
            billingCurrency,
            addressType,
            internationalVerified,
            representativeName,
        } = parsed.data;

        let panNumber: string | null = null;
        let cinNumber: string | null = null;
        let gstNumber: string | null = null;

        const panVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "pan",
                verificationStatus: "success",
            },
            orderBy: { createdAt: "desc" },
        });

        if (panVerification?.extractedData) {
            const extracted = panVerification.extractedData as any;
            panNumber = extracted?.pan || null;
        }

        const cinVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "cin",
            },
            orderBy: { createdAt: "desc" },
        });

        if (cinVerification?.extractedData) {
            const extracted = cinVerification.extractedData as any;
            if (extracted?.status === "VALID") {
                cinNumber = extracted?.cin || null;
            }
        }

        const gstVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "gst",
            },
            orderBy: { createdAt: "desc" },
        });

        if (gstVerification?.extractedData) {
            const extracted = gstVerification.extractedData as any;
            if (extracted?.valid === true) {
                gstNumber = extracted?.GSTIN || null;
            }
        }

        // ── Upsert KYC profile ────────────────────────────────────────────────
        const kycProfile = await db.kycProfile.upsert({
            where: { userId: user.id },

            update: {
                accountType,
                currency: billingCurrency || (country === "India" ? "INR" : "USD"),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                country,
                state: state || null,
                city: city || null,
                postalCode: postalCode || null,
                streetAddress: streetAddress || null,
                companyName: companyName || null,
                businessType: businessType || null,
                gstVerified: !!gstVerification,
                cinVerified: !!cinVerification,
                aadharVerified: !!aadharVerified,
                panNumber,
                panVerified: !!panVerification,
                cinNumber,
                gstNumber,
                addressType: typeof addressType === "number" ? addressType : 0,
                internationalVerified: !!internationalVerified,
                representativeName: representativeName || null,
                status: "pending",
            },

            create: {
                userId: user.id,
                accountType,
                currency: billingCurrency || (country === "India" ? "INR" : "USD"),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                country,
                state: state || null,
                city: city || null,
                postalCode: postalCode || null,
                streetAddress: streetAddress || null,
                companyName: companyName || null,
                businessType: businessType || null,
                gstVerified: !!gstVerification,
                cinVerified: !!cinVerification,
                aadharVerified: !!aadharVerified,
                panNumber,
                panVerified: !!panVerification,
                cinNumber,
                gstNumber,
                addressType: typeof addressType === "number" ? addressType : 0,
                internationalVerified: !!internationalVerified,
                representativeName: representativeName || null,
                status: "pending",
            },
        });

        await sendKycSlackNotification({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            countryCode: user.countryCode,
            accountType,
            country,
            companyName,
            businessType,
            currency:
                billingCurrency ||
                (country === "India" ? "INR" : "USD"),
        });

        // ── Save uploaded business documents ─────────────────────────────────
        if (uploadedFiles.length > 0) {

            // for (const { file, documentType, label } of uploadedFiles) {
            for (const file of uploadedFiles) {

                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                await validateUploadFile(file);

                const detectedType = await validateFileSignature(buffer);

                const ext = `.${detectedType.ext}`;

                const safeFilename = `${randomUUID()}${ext}`;

                const relativePath = `business-documents/${user.id}/${safeFilename}`;

                const absolutePath = path.join(
                    process.cwd(),
                    "private",
                    relativePath
                );

                await mkdir(path.dirname(absolutePath), { recursive: true });

                await writeFile(absolutePath, buffer);

                await db.businessDocument.create({
                    data: {
                        kycProfileId: kycProfile.id,
                        // documentType,
                        // label,
                        originalName: file.name,
                        storagePath: relativePath,
                        mimeType: detectedType.mime,
                        sizeBytes: file.size,
                    },
                });
            }
        }

        // ── Link verification documents ──────────────────────────────────────
        await db.verificationDocument.updateMany({
            where: {
                userId: user.id,
                kycProfileId: null,
            },
            data: { kycProfileId: kycProfile.id },
        });

        // ── Update onboarding status to completed ───────────────────────────
        try {
            await db.onboarding.update({
                where: { userId: user.id },
                data: { status: "completed" },
            });
        } catch (onboardingError) {
            console.error("Failed to update onboarding status:", onboardingError);
        }

        // ── Send KYC pending email ───────────────────────────────────────────
        if (kycProfile.status === "pending") {

            try {
                await sendTemplateEmail({
                    templateSlug: "onboarding-under-review",
                    to: user.email,
                    variables: {
                        first_name: user.firstName,
                        support_email: "support@cantech.in",
                        current_year: new Date().getFullYear().toString(),
                    },
                });
            } catch (emailError) {
                console.error("Failed to send KYC pending email:", emailError);
            }
        }

        return NextResponse.json({
            success: true,
            message: "KYC submitted successfully",
            kycProfileId: kycProfile.id,
        });

    } catch (error) {

        console.error("Save KYC error:", error);

        return NextResponse.json(
            { error: "Failed to save KYC" },
            { status: 500 }
        );
    }
}