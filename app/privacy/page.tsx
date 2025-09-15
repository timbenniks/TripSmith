import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-4 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to TripSmith
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/70">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-black/20 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl ring-1 ring-white/20 p-8">
          <div className="prose prose-invert prose-purple max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Information We Collect
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We collect information you provide directly to us, such as
                  when you create an account, plan a trip, or contact us for
                  support.
                </p>
                <h3 className="text-lg font-medium text-white">
                  Account Information
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email address</li>
                  <li>
                    Profile information from OAuth providers (Google, GitHub)
                  </li>
                  <li>Display name and profile picture</li>
                </ul>
                <h3 className="text-lg font-medium text-white">Trip Data</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Trip destinations, dates, and preferences</li>
                  <li>Chat conversations with our AI assistant</li>
                  <li>Saved itineraries and trip plans</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. How We Use Your Information
              </h2>
              <div className="text-white/90 space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Provide, maintain, and improve our trip planning services
                  </li>
                  <li>
                    Generate personalized travel recommendations and itineraries
                  </li>
                  <li>Save and sync your trips across devices</li>
                  <li>Send you service-related communications</li>
                  <li>
                    Respond to your comments, questions, and customer service
                    requests
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Information Sharing
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We do not sell, trade, or otherwise transfer your personal
                  information to third parties except as described in this
                  policy:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Service Providers:</strong> We may share information
                    with trusted service providers who assist us in operating
                    our website and providing services to you
                  </li>
                  <li>
                    <strong>AI Services:</strong> Trip data may be processed by
                    AI services (OpenAI) to generate travel recommendations, but
                    this data is not stored by these services
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> We may disclose
                    information when required by law or to protect our rights
                    and safety
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Data Security
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We implement appropriate security measures to protect your
                  personal information against unauthorized access, alteration,
                  disclosure, or destruction. This includes:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and updates</li>
                  <li>
                    Limited access to personal information on a need-to-know
                    basis
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Your Rights
              </h2>
              <div className="text-white/90 space-y-4">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access, update, or delete your personal information</li>
                  <li>Export your trip data</li>
                  <li>Opt out of non-essential communications</li>
                  <li>Request deletion of your account and associated data</li>
                </ul>
                <p>
                  To exercise these rights, please contact us at{" "}
                  <a
                    href="mailto:privacy@tripsmith.ai"
                    className="text-purple-300 hover:text-purple-200"
                  >
                    privacy@tripsmith.ai
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Cookies and Tracking
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We use cookies and similar technologies to maintain your
                  session, remember your preferences, and improve our services.
                  You can control cookie settings through your browser.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Third-Party Services
              </h2>
              <div className="text-white/90 space-y-4">
                <p>Our service integrates with third-party providers:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Supabase:</strong> Database and authentication
                    services
                  </li>
                  <li>
                    <strong>OpenAI:</strong> AI-powered trip planning assistance
                  </li>
                  <li>
                    <strong>OAuth Providers:</strong> Google and GitHub for
                    authentication
                  </li>
                </ul>
                <p>
                  These services have their own privacy policies and we
                  encourage you to review them.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Children's Privacy
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  Our service is not intended for children under 13. We do not
                  knowingly collect personal information from children under 13.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Changes to This Policy
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We may update this privacy policy from time to time. We will
                  notify you of any changes by posting the new policy on this
                  page and updating the "Last updated" date.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Contact Us
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  If you have any questions about this privacy policy, please
                  contact us at:
                </p>
                <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:privacy@tripsmith.ai"
                      className="text-purple-300 hover:text-purple-200"
                    >
                      privacy@tripsmith.ai
                    </a>
                  </p>
                  <p>
                    Website:{" "}
                    <a
                      href="https://tripsmith.ai"
                      className="text-purple-300 hover:text-purple-200"
                    >
                      https://tripsmith.ai
                    </a>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
