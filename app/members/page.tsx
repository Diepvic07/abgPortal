import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { MemberSearchPageClient } from "@/components/members/member-search-page-client";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");
  return <MemberSearchPageClient />;
}
