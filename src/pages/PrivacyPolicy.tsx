import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const PrivacyPolicy = () => {
  return (
    <AppLayout title="Privacy Policy">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          </CardHeader>

          {/* ScrollArea wraps the CardContent */}
          <ScrollArea className="h-[60vh]">
            <CardContent className="prose prose-slate max-w-none py-[20px] pr-4">
              <p className="text-muted-foreground"><strong>Effective Date:</strong> April 13, 2025</p>

              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
                  <p>We may collect the following types of information:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Personal Identification Information:</strong> Name, email, phone, Pi Network username</li>
                    <li><strong>Business Information:</strong> Business name, address, hours, description</li>
                    <li><strong>Location Data:</strong> Precise location data (with permission)</li>
                    <li><strong>Usage Information:</strong> Pages visited, features used, search queries</li>
                    <li><strong>Device Information:</strong> IP, browser, OS, device identifiers</li>
                    <li><strong>Transaction Data:</strong> Pi payments, subscriptions, or other transactions</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">2. How We Use Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Verify business listings and Pi payment acceptance</li>
                    <li>Display relevant business recommendations</li>
                    <li>Generate analytics and insights</li>
                    <li>Send notifications about new features and updates</li>
                    <li>Respond to comments and customer service requests</li>
                    <li>Protect against fraudulent transactions</li>
                    <li>Develop new features and services</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">3. Sharing Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>With Service Providers:</strong> Vendors performing services on our behalf</li>
                    <li><strong>Business Partners:</strong> Pi Network and other partners</li>
                    <li><strong>For Legal Compliance:</strong> Required by law or to protect rights/safety</li>
                    <li><strong>With Your Consent:</strong> Only when you consent</li>
                    <li><strong>Business Transfers:</strong> During mergers, acquisitions, or sales</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">4. Security of Your Information</h2>
                  <p>
                    We use technical and organizational measures to protect your information. No method of transmission/storage is 100% secure, but we use commercially acceptable means.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">5. Your Privacy Rights</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request copies of personal information</li>
                    <li><strong>Rectification:</strong> Correct or complete information</li>
                    <li><strong>Erasure:</strong> Request deletion</li>
                    <li><strong>Restrict Processing:</strong> Restrict processing in certain cases</li>
                    <li><strong>Data Portability:</strong> Transfer information to another organization</li>
                    <li><strong>Objection:</strong> Object to processing</li>
                  </ul>
                  <p>Contact <strong>privacy@avantemaps.com</strong> to exercise your rights.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">6. Children's Privacy</h2>
                  <p>
                    Our Service is not directed to children under 13. We do not knowingly collect data from children under 13. Parents/guardians should contact us if aware of such data.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">7. Changes to This Privacy Policy</h2>
                  <p>
                    Updates will be posted on this page and the "Effective Date" updated.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">8. Contact Us</h2>
                  <p>
                    Questions about this Privacy Policy? Contact us at:
                  </p>
                  <p className="mt-2">
                    <strong>Email:</strong> support@avantemaps.com<br />
                    <strong>Address:</strong> 113 Jabu Ndlovu Street, KZN 3201
                  </p>
                </section>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PrivacyPolicy;
