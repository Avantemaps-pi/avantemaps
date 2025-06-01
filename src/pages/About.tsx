
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Mail, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  return (
    <AppLayout title="About Us">
      <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">About Avante Maps</h1>
          <p className="text-muted-foreground">Discover the mission behind our platform for Pi cryptocurrency adoption.</p>
        </div>

        <Card className="material-card">
          <CardHeader>
           <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="bg-white from-primary to-secondary p-2 rounded-md">
                <img src="/lovable-uploads/Avante-Maps-icon.svg" alt="Avante Maps Icon" className="h-10 w-10" />
              </div>
              Our Mission
            </CardTitle>
            <CardDescription>
              Empowering businesses and consumers with cryptocurrency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Avante Maps is dedicated to accelerating the adoption of Pi cryptocurrency by connecting consumers with local and online businesses that accept Pi as payment.
            </p>
            <p>
              Our platform makes it easy for Pi holders to discover places where they can spend their digital currency, while helping businesses reach a growing community of crypto enthusiasts.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="material-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">For Businesses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                By registering your business on Avante Maps, you gain access to a dedicated community of Pi users looking to support businesses that embrace cryptocurrency.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Increased visibility in the Pi ecosystem</li>
                <li>Simplified customer discovery process</li>
                <li>Free business listing and promotion</li>
                <li>Join the future of digital payments</li>
              </ul>
              <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/registration')}>
                Register Your Business
              </Button>
            </CardContent>
          </Card>

          <Card className="material-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">For Consumers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Find places to spend your Pi cryptocurrency, from local cafes to online shops, all in one convenient location.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Discover Pi-accepting businesses near you</li>
                <li>Save your favorite places for later</li>
                <li>Get notifications about new businesses</li>
                <li>Support the growing Pi economy</li>
              </ul>
              <Button className="w-full mt-4" onClick={() => navigate('/')}>
                Explore the Map
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="material-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Our Story</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Avante Maps was founded by a group of Pi Network enthusiasts who recognized the need for a dedicated platform to connect Pi users with businesses accepting the currency.
            </p>
            <p>
              What started as a simple directory has evolved into a comprehensive mapping service, designed to make Pi cryptocurrency more accessible and useful in everyday transactions.
            </p>
            <p>
              We're constantly working to improve our platform and expand our database of Pi-accepting businesses worldwide.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold">Connect With Us</h2>
          <div className="flex space-x-4">
            <Button variant="outline" className="rounded-full" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="rounded-full" size="icon">
              <Mail className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="rounded-full" size="icon">
              <Github className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            © 2025 Avante Maps. All rights reserved.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default About;
