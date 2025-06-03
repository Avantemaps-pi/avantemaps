import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
const PrivacyPolicy = () => {
  return <AppLayout title="Privacy Policy">
      <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 animate-fade-in">
        <div className="space-y-4">
          
          <p className="text-muted-foreground"><strong>Effective Date:</strong> April 13, 2025</p>
        </div>

        <Card className="material-card">
          <CardHeader>
            <CardTitle>Our Commitment to Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                <p>
                  At Avante Maps, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our mobile application.
                </p>
                <p>
                  Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
                </p>

                <h3 className="text-lg font-medium">1. Information We Collect</h3>
                <p>We may collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Personal Identification Information:</strong> Name, email address, phone number, and Pi Network username when you register or update your profile.</li>
                  <li><strong>Business Information:</strong> If you register a business, we collect business name, address, operating hours, description, and other related details.</li>
                  <li><strong>Location Data:</strong> With your permission, we collect precise location data to show nearby businesses and provide mapping functionality.</li>
                  <li><strong>Usage Information:</strong> Data about how you interact with our app, including pages visited, features used, search queries, and time spent on the app.</li>
                  <li><strong>Device Information:</strong> Information about your device, including IP address, browser type, operating system, and mobile device identifiers.</li>
                  <li><strong>Transaction Data:</strong> Records of Pi payments, subscriptions, or other financial transactions conducted through our platform.</li>
                </ul>

                <h3 className="text-lg font-medium">2. How We Use Your Information</h3>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Verify business listings and Pi payment acceptance</li>
                  <li>Display relevant business recommendations based on your location and preferences</li>
                  <li>Generate analytics and insights about how users interact with our platform</li>
                  <li>Send notifications about new features, businesses, or relevant updates</li>
                  <li>Respond to your comments, questions, and customer service requests</li>
                  <li>Protect against fraudulent or unauthorized transactions</li>
                  <li>Develop new features and services based on user feedback and behavior</li>
                </ul>

                <h3 className="text-lg font-medium">3. Sharing Your Information</h3>
                <p>We may share your information in the following situations:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>With Service Providers:</strong> Third-party vendors who perform services on our behalf, such as payment processing, data analysis, email delivery, and hosting services.</li>
                  <li><strong>Business Partners:</strong> We may share data with Pi Network and other business partners to facilitate transactions and provide integrated services.</li>
                  <li><strong>For Legal Compliance:</strong> We may disclose information where required by law or if we believe disclosure is necessary to protect our rights or the safety of others.</li>
                  <li><strong>With Your Consent:</strong> We may share your information with third parties when you have given us your consent to do so.</li>
                  <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business.</li>
                </ul>

                <h3 className="text-lg font-medium">4. Security of Your Information</h3>
                <p>
                  We implement appropriate technical and organizational measures to protect the security of your personal information. However, please recognize that no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
                </p>

                <h3 className="text-lg font-medium">5. Your Privacy Rights</h3>
                <p>Depending on your location, you may have the following rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> You can request copies of your personal information we hold.</li>
                  <li><strong>Rectification:</strong> You can ask us to correct inaccurate information or complete incomplete information.</li>
                  <li><strong>Erasure:</strong> You can ask us to delete your personal information in certain circumstances.</li>
                  <li><strong>Restrict Processing:</strong> You can ask us to restrict the processing of your information in certain circumstances.</li>
                  <li><strong>Data Portability:</strong> You can ask us to transfer your information to another organization or directly to you.</li>
                  <li><strong>Objection:</strong> You can object to our processing of your personal information.</li>
                </ul>
                <p>
                  To exercise any of these rights, please contact us at privacy@avantemaps.com.
                </p>

                <h3 className="text-lg font-medium">6. Children's Privacy</h3>
                <p>
                  Our Service is not directed to children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us.
                </p>

                <h3 className="text-lg font-medium">7. Changes to This Privacy Policy</h3>
                <p>
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top. You are advised to review this Privacy Policy periodically for any changes.
                </p>

                <h3 className="text-lg font-medium">8. Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p>
                  privacy@avantemaps.com<br />
                  Avante Maps<br />
                  123 Pi Street<br />
                  San Francisco, CA 94103
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
};
export default PrivacyPolicy;