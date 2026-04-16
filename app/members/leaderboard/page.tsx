import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LeaderboardPageClient } from "@/components/members/leaderboard-page-client";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");
  return <LeaderboardPageClient />;
}
