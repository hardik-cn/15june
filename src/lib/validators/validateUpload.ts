import { fileTypeFromBuffer } from "file-type";

export const ALLOWED_EXTENSIONS = [
    "pdf",
    "jpg",
    "jpeg",
    "png",
];

export const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function validateUploadFile(file: File) {

    if (!file || file.size === 0) {
        throw new Error("Please upload a valid file");
    }

    // Max size validation
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            "File size must be smaller than 10MB"
        );
    }

    // Extension validation
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        throw new Error(
            "Only PDF, JPG, JPEG, and PNG files are allowed"
        );
    }

    // MIME validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(
            "Unsupported file format"
        );
    }
}

export async function validateFileSignature(buffer: Buffer) {

    const type = await fileTypeFromBuffer(buffer);

    if (!type) {
        throw new Error(
            "Unable to validate uploaded file"
        );
    }

    const allowedSignatures = [
        "pdf",
        "jpg",
        "jpeg",
        "png",
    ];

    if (!allowedSignatures.includes(type.ext)) {
        throw new Error(
            "Uploaded file format is not supported"
        );
    }

    return type;
}