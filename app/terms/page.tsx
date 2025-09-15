import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold text-white mb-2">
            Terms of Service
          </h1>
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
                1. Acceptance of Terms
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  By accessing and using TripSmith ("the Service"), you accept
                  and agree to be bound by the terms and provision of this
                  agreement. If you do not agree to abide by the above, please
                  do not use this service.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Description of Service
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  TripSmith is an AI-powered travel planning service that helps
                  users create, manage, and share travel itineraries. The
                  Service includes:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>AI-generated travel recommendations and itineraries</li>
                  <li>Trip planning and management tools</li>
                  <li>Export functionality for itineraries (PDF, calendar)</li>
                  <li>Trip sharing capabilities</li>
                  <li>User account management</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. User Accounts
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  To access certain features of the Service, you must create an
                  account. You agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>
                    Accept responsibility for all activities under your account
                  </li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Acceptable Use
              </h2>
              <div className="text-white/90 space-y-4">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Transmit harmful, offensive, or inappropriate content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>
                    Use the Service for commercial purposes without permission
                  </li>
                  <li>Impersonate another person or entity</li>
                  <li>Collect personal information about other users</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Content and Intellectual Property
              </h2>
              <div className="text-white/90 space-y-4">
                <h3 className="text-lg font-medium text-white">Your Content</h3>
                <p>
                  You retain ownership of content you create using the Service.
                  By using the Service, you grant us a license to use, store,
                  and process your content solely to provide the Service to you.
                </p>

                <h3 className="text-lg font-medium text-white">Our Content</h3>
                <p>
                  The Service and its original content, features, and
                  functionality are owned by TripSmith and are protected by
                  international copyright, trademark, patent, trade secret, and
                  other intellectual property laws.
                </p>

                <h3 className="text-lg font-medium text-white">
                  AI-Generated Content
                </h3>
                <p>
                  Travel recommendations and itineraries generated by our AI are
                  provided for informational purposes only. You are responsible
                  for verifying all travel information before making bookings or
                  travel arrangements.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Privacy and Data Protection
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  Your privacy is important to us. Please review our{" "}
                  <Link
                    href="/privacy"
                    className="text-purple-300 hover:text-purple-200 underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  to understand how we collect, use, and protect your
                  information.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Service Availability
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We strive to provide reliable service, but we cannot guarantee
                  that the Service will be available at all times. The Service
                  may be temporarily unavailable due to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Scheduled maintenance</li>
                  <li>Technical issues</li>
                  <li>Third-party service interruptions</li>
                  <li>Force majeure events</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Disclaimer of Warranties
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  The Service is provided "as is" without warranties of any
                  kind. We specifically disclaim all warranties regarding:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Accuracy of travel information and recommendations</li>
                  <li>Availability of recommended services or venues</li>
                  <li>Fitness for a particular purpose</li>
                  <li>Uninterrupted or error-free operation</li>
                </ul>
                <p className="font-medium">
                  Always verify travel information independently and check
                  current travel advisories, visa requirements, and safety
                  conditions before traveling.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Limitation of Liability
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  To the maximum extent permitted by law, TripSmith shall not be
                  liable for any indirect, incidental, special, consequential,
                  or punitive damages, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Travel disruptions or cancellations</li>
                  <li>Financial losses related to travel bookings</li>
                  <li>Personal injury or property damage during travel</li>
                  <li>Loss of data or service interruptions</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Indemnification
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  You agree to indemnify and hold harmless TripSmith and its
                  affiliates from any claims, damages, losses, or expenses
                  arising from your use of the Service or violation of these
                  Terms.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Termination
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We may terminate or suspend your account and access to the
                  Service at any time, with or without cause or notice, for
                  conduct that we believe violates these Terms or is harmful to
                  other users, us, or third parties.
                </p>
                <p>
                  You may terminate your account at any time by contacting us.
                  Upon termination, your right to use the Service will cease
                  immediately.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Changes to Terms
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  We reserve the right to modify these Terms at any time. We
                  will notify users of material changes by posting the updated
                  Terms on our website and updating the "Last updated" date.
                </p>
                <p>
                  Your continued use of the Service after changes are posted
                  constitutes acceptance of the modified Terms.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                13. Governing Law
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  These Terms shall be governed by and construed in accordance
                  with the laws of the jurisdiction in which TripSmith operates,
                  without regard to conflict of law principles.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                14. Contact Information
              </h2>
              <div className="text-white/90 space-y-4">
                <p>
                  If you have any questions about these Terms of Service, please
                  contact us at:
                </p>
                <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:legal@tripsmith.ai"
                      className="text-purple-300 hover:text-purple-200"
                    >
                      legal@tripsmith.ai
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
