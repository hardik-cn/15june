

export type Step = "credentials" | "setup-2fa" | "verify-2fa";

export interface FormErrors {
    email: string;
    password: string;
    general: string;
}
