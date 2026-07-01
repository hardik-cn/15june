import InviteClient from "../InviteClient";
import { db } from "@/lib/db";

interface InvitePageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function InvitePage({
    params,
}: InvitePageProps) {
    const { id } = await params;

    // Fetch invite/user data using the id (uuidToken)
    const invitation = await db.userInvitation.findUnique({
        where: {
            uuidToken: id
        }
    }).catch(() => null);

    const email = invitation?.email || "";

    return <InviteClient inviteId={id} defaultEmail={email} />;
}