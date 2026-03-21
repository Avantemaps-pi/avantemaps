import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
  return <AppLayout title="Contact Us">
      <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 animate-fade-in">
        <div className="space-y-4">
          <p className="text-muted-foreground">Have questions or feedback? We'd love to hear from you.</p>
        </div>

        <Card className="material-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Email</h3>
              </div>
              <p className="text-sm break-all">inquiries@avantemaps.com</p>
              <p className="text-xs text-muted-foreground mt-1">For general inquiries</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Phone</h3>
              </div>
              <p className="text-sm">+27 (68) 342-2444</p>
              <p className="text-xs text-muted-foreground mt-1">+27 (62) 476-7535</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Address</h3>
              </div>
              <p className="text-sm">113 Jabu Ndlovu</p>
              <p className="text-xs text-muted-foreground mt-1">Pietermaritzburg, KZN 3201</p>
            </div>
          </div>
        </Card>

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
                  Department
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiries@avantemaps.com">Inquiries</SelectItem>
                    <SelectItem value="partnerships@avantemaps.com">Partnerships</SelectItem>
                    <SelectItem value="support@avantemaps.com">Support</SelectItem>
                    <SelectItem value="businesses@avantemaps.com">Businesses</SelectItem>
                  </SelectContent>
                </Select>
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
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is Avante Maps?</AccordionTrigger>
                <AccordionContent>
                  Avante Maps is a platform that helps users find businesses that accept Pi cryptocurrency as payment.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I register my business?</AccordionTrigger>
                <AccordionContent>
                  You can register your business by clicking on the "Register Business" option in the navigation menu and following the steps.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is Avante Maps affiliated with Pi Network?</AccordionTrigger>
                <AccordionContent>
                  Avante Maps is an independent platform created by Pi Network enthusiast to support the Pi ecosystem.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
