// app/onboarding/digilocker/callback/page.tsx
import { Suspense } from 'react';
import DigiLockerCallbackContent from './DigiLockerCallbackContent';

export default function DigiLockerCallbackPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <DigiLockerCallbackContent />
        </Suspense>
    );
}