// app/onboarding/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import KYCValidation from "./components/KYCValidation";

type Props = {
    searchParams: Promise<{
        id?: string;
    }>;
};

export default async function OnboardingPage({ searchParams }: Props) {

    const params = await searchParams;
    const id = params?.id;

    if (!id) redirect("/dashboard");

    const onboarding = await db.onboarding.findFirst({
        where: {
            uuid: id,
            status: "pending",
        },
    });

    if (!onboarding) {
        redirect("/dashboard");
    }

    return <KYCValidation onboardingId={id} />;
}