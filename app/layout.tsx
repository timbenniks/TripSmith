import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/auth-provider";
import { Suspense } from "react";
import "./globals.css";
import { ErrorPanel } from "@/components/error-panel";
import { ConditionalFooter } from "@/components/conditional-footer";
import PlausibleProvider from "next-plausible";

export const metadata: Metadata = {
  title: "TripSmith - AI Travel Planner",
  description: "Your AI travel planner for solo business trips",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} dark h-full`}
      >
        <PlausibleProvider
          domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN as string}
          enabled={true}
          revenue={true}
          hash={false}
          trackLocalhost={true}
          trackOutboundLinks={true}
          trackFileDownloads={true}
          taggedEvents={true}
        >
          <Suspense fallback={null}>
            <AuthProvider>
              {/* Skip to content link for keyboard users */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Skip to main content
              </a>
              <ConditionalFooter>
                <main id="main-content" role="main" className="h-full">
                  {children}
                </main>
              </ConditionalFooter>
              <ErrorPanel />
            </AuthProvider>
          </Suspense>
        </PlausibleProvider>
      </body>
    </html>
  );
}
