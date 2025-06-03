import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
const TermsOfService = () => {
  return <AppLayout title="Terms of Service">
      <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 animate-fade-in">
        <div className="space-y-4">
          
          <p className="text-muted-foreground"><strong>Effective Date:</strong> April 13, 2025</p>
        </div>

        <Card className="material-card">
          <CardHeader>
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                <p>
                  Welcome to Avante Maps. These Terms of Service ("Terms") govern your access to and use of the Avante Maps website, mobile application, and services (collectively, the "Service").
                </p>
                <p>
                  Please read these Terms carefully. By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Service.
                </p>

                <h3 className="text-lg font-medium">1. Use of Service</h3>
                <p>
                  Avante Maps provides a platform for users to find businesses that accept Pi cryptocurrency and for businesses to register and promote their acceptance of Pi as a payment method.
                </p>
                <p>
                  You may use our Service only as permitted by law and in accordance with these Terms. You agree not to misuse the Service or help anyone else do so.
                </p>

                <h3 className="text-lg font-medium">2. User Accounts</h3>
                <p>
                  When you create an account with us, you must provide accurate and complete information. You are responsible for maintaining the security of your account and for all activities that occur under your account.
                </p>
                <p>
                  We reserve the right to refuse service, terminate accounts, remove or edit content, or cancel orders at our sole discretion.
                </p>

                <h3 className="text-lg font-medium">3. Business Listings</h3>
                <p>
                  If you register a business on our platform, you are responsible for ensuring that all information provided is accurate, complete, and up-to-date. We reserve the right to remove any business listing that violates these Terms or that we determine, in our sole discretion, is inappropriate.
                </p>
                <p>
                  By listing your business on our platform, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, publish, and display the information you provide for the purpose of operating and promoting the Service.
                </p>

                <h3 className="text-lg font-medium">4. User Content</h3>
                <p>
                  Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
                </p>
                <p>
                  By posting Content on or through the Service, you represent and warrant that: (i) the Content is yours or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
                </p>

                <h3 className="text-lg font-medium">5. Intellectual Property</h3>
                <p>
                  The Service and its original content, features, and functionality are owned by Avante Maps and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                </p>
                <p>
                  You may not duplicate, copy, or reuse any portion of the HTML/CSS, JavaScript, or visual design elements or concepts without express written permission from Avante Maps.
                </p>

                <h3 className="text-lg font-medium">6. Prohibited Activities</h3>
                <p>You agree not to engage in any of the following prohibited activities:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Using the Service for any illegal purpose or in violation of any local, state, national, or international law</li>
                  <li>Harassing, abusing, or harming another person</li>
                  <li>Impersonating another user or person</li>
                  <li>Using another user's account without permission</li>
                  <li>Attempting to circumvent any content filtering techniques we employ</li>
                  <li>Interfering with or disrupting the Service or servers or networks connected to the Service</li>
                  <li>Attempting to access areas/features of the Service that you are not authorized to access</li>
                </ul>

                <h3 className="text-lg font-medium">7. Termination</h3>
                <p>
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
                <p>
                  Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.
                </p>

                <h3 className="text-lg font-medium">8. Limitation of Liability</h3>
                <p>
                  In no event shall Avante Maps, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                </p>

                <h3 className="text-lg font-medium">9. Disclaimer</h3>
                <p>
                  Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
                </p>

                <h3 className="text-lg font-medium">10. Governing Law</h3>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
                </p>

                <h3 className="text-lg font-medium">11. Changes to Terms</h3>
                <p>
                  We reserve the right to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                </p>

                <h3 className="text-lg font-medium">12. Contact Us</h3>
                <p>
                  If you have any questions about these Terms, please contact us at terms@avantemaps.com.
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
};
export default TermsOfService;