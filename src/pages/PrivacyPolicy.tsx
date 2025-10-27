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
          <CardContent className="prose prose-slate max-w-none py-[20px]">
            <p className="text-muted-foreground"><strong>Effective Date:</strong> April 13, 2025</p>

            <ScrollArea className="h-[60vh] mt-6 pr-4">
              <div className="space-y-8">

                {/* Section 1 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
                  <p>We may collect the following types of information:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Personal Identification Information:</strong> Name, email, phone number, and Pi Network username.</li>
                    <li><strong>Business Information:</strong> Business name, address, operating hours, description, and related details.</li>
                    <li><strong>Location Data:</strong> With your permission, precise location data for mapping functionality.</li>
                    <li><strong>Usage Information:</strong> Data about how you interact with our app.</li>
                    <li><strong>Device Information:</strong> IP address, browser type, OS, and device identifiers.</li>
                    <li><strong>Transaction Data:</strong> Records of Pi payments, subscriptions, or other transactions.</li>
                  </ul>
                </section>

                {/* Section 2 */}
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

                {/* Section 3 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">3. Sharing Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>With Service Providers:</strong> Third-party vendors for services like payment processing, analytics, email delivery, and hosting.</li>
                    <li><strong>Business Partners:</strong> Pi Network and other partners for integrated services.</li>
                    <li><strong>For Legal Compliance:</strong> When required by law or to protect rights/safety.</li>
                    <li><strong>With Your Consent:</strong> Only shared when you consent.</li>
                    <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or sales of company assets.</li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">4. Security of Your Information</h2>
                  <p>
                    We implement technical and organizational measures to protect your information. No method of transmission or storage is 100% secure, but we use commercially acceptable means to protect it.
                  </p>
                </section>

                {/* Section 5 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">5. Your Privacy Rights</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request copies of personal information we hold.</li>
                    <li><strong>Rectification:</strong> Correct or complete your information.</li>
                    <li><strong>Erasure:</strong> Request deletion under certain circumstances.</li>
                    <li><strong>Restrict Processing:</strong> Restrict processing in certain circumstances.</li>
                    <li><strong>Data Portability:</strong> Transfer your information to another organization.</li>
                    <li><strong>Objection:</strong> Object to processing of your personal information.</li>
                  </ul>
                  <p>To exercise any rights, contact us at <strong>privacy@avantemaps.com</strong>.</p>
                </section>

                {/* Section 6 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">6. Children's Privacy</h2>
                  <p>
                    Our Service is not directed to children under 13. We do not knowingly collect data from children under 13. Parents/guardians should contact us if aware of such data collection.
                  </p>
                </section>

                {/* Section 7 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">7. Changes to This Privacy Policy</h2>
                  <p>
                    We may update our Privacy Policy periodically. Updates will be posted on this page and the "Effective Date" updated.
                  </p>
                </section>

                {/* Section 8 */}
                <section>
                  <h2 className="text-xl font-bold mb-4">8. Contact Us</h2>
                  <p>
                    Questions about this Privacy Policy? Contact us at:
                  </p>
                  <p className="mt-2">
                    <strong>Email:</strong> privacy@avantemaps.com<br />
                    <strong>Address:</strong> 123 Pi Street, San Francisco, CA 94103
                  </p>
                </section>

              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PrivacyPolicy;
