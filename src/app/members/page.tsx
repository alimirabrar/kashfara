import { currentMember } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import MembersList from "@/components/MembersList";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const me = await currentMember();
  if (!me) return null;
  return (
    <DashboardShell me={me} team={[]}>
      <MembersList meId={me.id} isAdmin={me.role === "admin"} />
    </DashboardShell>
  );
}
