import InviteClient from "./InviteClient";

interface InviteRouteProps {
    searchParams?: Promise<{
        id?: string;
        email?: string;
    }>;
}

export default async function InviteRoute({ searchParams }: InviteRouteProps) {
    const params = searchParams ? await searchParams : {};
    const inviteId = params.id || "";
    const email = params.email || "";

    return <InviteClient inviteId={inviteId} defaultEmail={email} />;
}