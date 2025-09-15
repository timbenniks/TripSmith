import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";

export default async function TripsLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side auth check for all /trips/* routes
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }
  return <>{children}</>;
}
