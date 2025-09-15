import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-sm text-white/60">
            © {new Date().getFullYear()} TripSmith. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-white/60 hover:text-purple-300 transition-colors underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-white/60 hover:text-purple-300 transition-colors underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
