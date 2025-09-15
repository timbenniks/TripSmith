"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

interface ConditionalFooterProps {
  children: React.ReactNode;
}

export function ConditionalFooter({ children }: ConditionalFooterProps) {
  const pathname = usePathname();

  // Don't show footer on individual trip pages
  const hideFooter = pathname?.startsWith("/trips/") && pathname !== "/trips";

  if (hideFooter) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
