// lib/cashfree.ts
import crypto from 'crypto';

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';

const CLIENT_ID = process.env.CASHFREE_CLIENT_ID!;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

interface CashfreeHeaders {
    'Content-Type': string;
    'x-client-id': string;
    'x-client-secret': string;
    'x-api-version': string;
    [key: string]: string;
}

export class CashfreeVerificationClient {
    private headers: CashfreeHeaders;

    constructor() {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Cashfree credentials not configured');
        }

        this.headers = {
            'Content-Type': 'application/json',
            'x-client-id': CLIENT_ID,
            'x-client-secret': CLIENT_SECRET,
            'x-api-version': '2022-09-01',
        };
    }

    /**
     * DigiLocker Verification - Step 1
     * Creates verification request and returns consent URL
     * 
     * @param userId - The user ID for tracking
     * @param onboardingId - The onboarding UUID to redirect back to
     */
    async initiateDigiLocker(userId: number, onboardingId?: string) {
        try {
            const verificationId = this.generateVerificationId(userId);

            // Build redirect URL with onboarding ID if provided
            let redirectUrl = `${APP_URL}/onboarding/digilocker/callback`;
            if (onboardingId) {
                redirectUrl += `?onboarding_id=${onboardingId}`;
            }

            console.log('Initiating DigiLocker with:', {
                verificationId,
                redirectUrl,
                onboardingId,
                baseUrl: CASHFREE_BASE_URL
            });

            const response = await fetch(`${CASHFREE_BASE_URL}/verification/digilocker`, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    verification_id: verificationId,
                    document_requested: ["AADHAAR"],
                    redirect_url: redirectUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Cashfree DigiLocker initiate error:", data);
                throw new Error(data.message || "DigiLocker verification failed");
            }

            console.log('DigiLocker initiated successfully:', {
                verificationId: data.verification_id,
                status: data.status
            });

            return {
                verification_id: data.verification_id,
                url: data.url,
                status: data.status
            };
        } catch (error) {
            console.error("DigiLocker initiation error:", error);
            throw error;
        }
    }

    /**
     * DigiLocker Verification - Step 2
     * Check verification status after user completes consent
     */
    async getDigiLockerStatus(verificationId: string) {
        try {
            const url = `${CASHFREE_BASE_URL}/verification/digilocker?verification_id=${verificationId}`;

            console.log('Checking DigiLocker status:', {
                url,
                verificationId,
                headers: {
                    'x-client-id': this.headers['x-client-id'],
                    'x-api-version': this.headers['x-api-version'],
                    'Content-Type': this.headers['Content-Type']
                }
            });

            const response = await fetch(url, {
                method: "GET",
                headers: this.headers,
            });

            // Log response headers
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            console.log('DigiLocker status response headers:', responseHeaders);

            // Log raw response for debugging
            const responseText = await response.text();
            console.log('DigiLocker status raw response:', {
                status: response.status,
                statusText: response.statusText,
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 500)
            });

            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError: any) {
                console.error('Failed to parse status response as JSON:', {
                    error: parseError.message,
                    responseText: responseText.substring(0, 200)
                });
                throw new Error(`Invalid JSON response from Cashfree: ${responseText.substring(0, 100)}`);
            }

            if (!response.ok) {
                console.error("Cashfree status error:", data);
                throw new Error(data.message || "Failed to fetch DigiLocker status");
            }

            console.log('DigiLocker status parsed successfully:', {
                verificationId,
                status: data.status,
                hasUserDetails: !!data.user_details,
                documentRequested: data.document_requested,
                documentConsent: data.document_consent
            });

            return data;
        } catch (error: any) {
            console.error("DigiLocker status fetch error:", {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * DigiLocker Verification - Step 3
     * Fetch Aadhaar document details after successful verification
     */
    async getDigiLockerDocument(verificationId: string) {
        try {
            console.log('Fetching DigiLocker document for:', verificationId);

            const response = await fetch(
                `${CASHFREE_BASE_URL}/verification/digilocker/document/AADHAAR?verification_id=${verificationId}`,
                {
                    method: "GET",
                    headers: this.headers,
                }
            );

            // Log raw response for debugging
            const responseText = await response.text();
            console.log('DigiLocker document raw response:', {
                status: response.status,
                statusText: response.statusText,
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 200)
            });

            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
            }

            if (!response.ok) {
                console.error("Cashfree document error:", data);
                throw new Error(data.message || "Failed to fetch DigiLocker document");
            }

            console.log('DigiLocker document fetched successfully:', {
                hasAddress: !!data.split_address,
                addressFields: data.split_address ? Object.keys(data.split_address) : []
            });

            return data;
        } catch (error) {
            console.error("DigiLocker document fetch error:", error);
            throw error;
        }
    }

    /**
     * PAN Verification - Sync API
     */
    async verifyPAN(panNumber: string) {
        const verificationId = this.generateVerificationId();

        // STEP-1 → create verification
        const createRes = await fetch(`${CASHFREE_BASE_URL}/verification/pan`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                verification_id: verificationId,
                pan: panNumber,
            }),
        });

        const createData = await createRes.json();

        if (!createRes.ok) {
            throw new Error(createData.message || "PAN verification failed");
        }

        const referenceId = createData.reference_id;

        // STEP-2 → fetch final status
        const statusRes = await fetch(
            `${CASHFREE_BASE_URL}/verification/pan/${referenceId}`,
            {
                method: "GET",
                headers: this.headers,
            }
        );

        const statusData = await statusRes.json();

        if (!statusRes.ok) {
            throw new Error(statusData.message || "PAN status fetch failed");
        }

        return statusData;
    }

    /**
     * CIN Verification
     */
    async verifyCIN(cinNumber: string, userId?: number) {
        try {
            const verificationId = this.generateVerificationId(userId);

            const response = await fetch(
                `${CASHFREE_BASE_URL}/verification/cin`,
                {
                    method: "POST",
                    headers: this.headers,
                    body: JSON.stringify({
                        verification_id: verificationId,
                        cin: cinNumber,
                    }),
                }
            );

            const data = await response.json();

            console.log("CIN API RESPONSE:", data);

            if (!response.ok) {
                throw new Error(data.message || "CIN verification failed");
            }

            return {
                ...data,
                verification_id: verificationId,
            };
        } catch (error) {
            console.error("CIN verification error:", error);
            throw error;
        }
    }

    /**
     * GSTIN Verification
     */
    async verifyGST(gstNumber: string, userId?: number) {
        try {
            const verificationId = this.generateVerificationId(userId);

            const response = await fetch(
                `${CASHFREE_BASE_URL}/verification/gstin`,
                {
                    method: "POST",
                    headers: this.headers,
                    body: JSON.stringify({
                        verification_id: verificationId,
                        gstin: gstNumber,
                    }),
                }
            );

            const data = await response.json();

            console.log("GST API RESPONSE:", data);

            if (!response.ok) {
                throw new Error(data.message || "GST verification failed");
            }

            return {
                ...data,
                verification_id: verificationId,
            };
        } catch (error) {
            console.error("GST verification error:", error);
            throw error;
        }
    }


    /**
     * Generate unique verification ID with user context
     */
    private generateVerificationId(userId?: number): string {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const userPart = userId ? `_U${userId}` : '';
        return `VER${userPart}_${timestamp}_${random}`;
    }
}

// Singleton instance
export const cashfreeClient = new CashfreeVerificationClient();