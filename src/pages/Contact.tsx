import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
const Contact = () => {
  return <AppLayout title="Contact Us">
      <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 animate-fade-in">
        <div className="space-y-4">
          
          <p className="text-muted-foreground">Have questions or feedback? We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="material-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">inquiries@avantemaps.com</p>
              <p className="text-xs text-muted-foreground mt-1">For general inquiries</p>
            </CardContent>
          </Card>

          <Card className="material-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Phone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">+27 (68) 342-2444</p>
              <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 9am-5pm PST</p>
            </CardContent>
          </Card>

          <Card className="material-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">123 Pi Street</p>
              <p className="text-xs text-muted-foreground mt-1">Pietermaritzburg, KZN 3201</p>
            </CardContent>
          </Card>
        </div>

        <Card className="material-card">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>
              We'll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input id="email" type="email" placeholder="Your email address" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input id="subject" placeholder="What is this regarding?" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea id="message" placeholder="How can we help you?" rows={5} className="resize-none" />
              </div>
              <Button className="w-full sm:w-auto" type="submit">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="material-card">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">What is Avante Maps?</h3>
              <p className="text-sm text-muted-foreground">
                Avante Maps is a platform that helps users find businesses that accept Pi cryptocurrency as payment.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How do I register my business?</h3>
              <p className="text-sm text-muted-foreground">
                You can register your business by clicking on the "Register Business" option in the navigation menu and following the steps.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Is Avante Maps affiliated with Pi Network?</h3>
              <p className="text-sm text-muted-foreground">
                Avante Maps is an independent platform created by Pi enthusiasts to support the Pi ecosystem.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <p className="text-sm text-muted-foreground">
            © 2025 Avante Maps. All rights reserved.
          </p>
        </div>
      </div>
    </AppLayout>;
};
export default Contact;
