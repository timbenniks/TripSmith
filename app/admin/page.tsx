import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/auth-roles";
import AdminDashboard from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if not logged in
  if (!user) {
    redirect("/");
  }

  // Redirect if not admin
  if (!isAdmin(user)) {
    redirect("/trips");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdminDashboard user={user} />
    </div>
  );
}
