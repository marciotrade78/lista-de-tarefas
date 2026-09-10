import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import Dashboard from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Dashboard user={user} />;
}
