import { z } from "zod";
import disposable from "disposable-email-domains-js";

// Use built-in checker (no manual Set needed)
const isDisposable = (email: string) => {
    return disposable.isDisposableEmail(email);
};

export const registerSchema = z.object({
    firstName: z.string().min(2).max(50).regex(/^[a-zA-Z\s]+$/),
    lastName: z.string().min(2).max(50).regex(/^[a-zA-Z\s]+$/),
    phone: z.string().regex(/^\d{10}$/),
    countryCode: z.string().min(1),

    email: z
        .string()
        .email("Invalid email format")
        .refine((email) => !isDisposable(email), "Invalid email address"),

    password: z
        .string()
        .min(8)
        .max(100)
        .regex(/[A-Z]/, "Must include uppercase")
        .regex(/[a-z]/, "Must include lowercase")
        .regex(/[0-9]/, "Must include number")
        .regex(/[!@#$%^&*]/, "Must include special char"),

    phoneVerified: z.boolean(),
    emailVerified: z.boolean(),
});