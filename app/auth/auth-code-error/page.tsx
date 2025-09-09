"use client";

import { useSearchParams } from "next/navigation";

export default function AuthCodeError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-black/20 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl ring-1 ring-white/20 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Authentication Error
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 font-medium">Error: {error}</p>
              {errorDescription && (
                <p className="text-red-200 text-sm mt-1">{errorDescription}</p>
              )}
            </div>
          )}

          <p className="text-white/70 mb-6">
            There was an issue signing you in. This could be due to:
          </p>
          <ul className="text-white/60 text-sm mb-6 text-left space-y-2">
            <li>• OAuth configuration issue</li>
            <li>• Callback URL mismatch</li>
            <li>• Temporary server issue</li>
            <li>• GitHub app configuration</li>
          </ul>

          <div className="space-y-3">
            <a
              href="/"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </a>

            <div className="text-xs text-white/50">
              <p>Debug info:</p>
              <p>
                Expected callback:
                https://hycbjohjuhzovsqpodeq.supabase.co/auth/v1/callback
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
