
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarIcon, ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import CommentSection from '@/components/comments/CommentSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';

const Review = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const isMobile = useIsMobile();
  const [business, setBusiness] = useState<Place | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("Please log in to write a review");
      navigate('/');
    }
  }, [user, isLoading, navigate]);
  
  // Load business data from state or fetch from database
  useEffect(() => {
    const loadBusiness = async () => {
      // First try to use state passed from navigation
      const businessDetails = location.state?.businessDetails;
      if (businessDetails) {
        setBusiness(businessDetails);
        setBusinessLoading(false);
        return;
      }

      // If no state and we have a businessId, fetch from database
      if (businessId) {
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', parseInt(businessId))
            .single();

          if (error) throw error;

          if (data) {
            // Extract contact info
            const contactInfo = data.contact_info as { phone?: string; website?: string } | null;
            
            // Build address from components
            const addressParts = [
              data.street_address,
              data.city,
              data.state,
              data.zip_code,
              data.country
            ].filter(Boolean);
            const fullAddress = addressParts.join(', ') || data.location || '';

            // Transform database record to Place type
            const place: Place = {
              id: data.id.toString(),
              name: data.business_name,
              position: { lat: data.lat || 0, lng: data.lng || 0 },
              address: fullAddress,
              streetAddress: data.street_address || undefined,
              city: data.city || undefined,
              state: data.state || undefined,
              postalCode: data.zip_code || undefined,
              country: data.country || undefined,
              rating: 0, // Will be calculated from reviews
              totalReviews: 0,
              category: data.business_types?.join(', ') || data.category || '',
              description: data.business_description || '',
              image: data.images?.[0] || undefined,
              images: data.images || undefined,
              phone: contactInfo?.phone || undefined,
              website: contactInfo?.website || undefined,
              hours: data.hours as Place['hours'] || undefined,
              isVerified: data.is_verified || false,
              isCertified: data.is_certified || false,
              verificationStatus: data.verification_status as Place['verificationStatus'] || null,
              business_types: data.business_types || undefined,
            };
            setBusiness(place);
          }
        } catch (error) {
          console.error('Error fetching business:', error);
          toast.error('Failed to load business details');
        }
      }
      setBusinessLoading(false);
    };

    loadBusiness();
  }, [businessId, location.state]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Safe back navigation - falls back to recommendations if no history
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/recommendations');
    }
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast.error("Please select a rating before submitting");
      return;
    }
    
    // In a real app, this would submit to a backend
    toast.success("Review submitted successfully!", {
      description: `You gave ${business?.name || 'the business'} a ${rating}-star rating.`
    });
    
    // Navigate back to business page
    setTimeout(() => handleGoBack(), 1500);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <AppLayout 
        title="Loading..."
        withHeader={false} 
        fullHeight={false}
        fullWidth={true}
        className="px-0"
      >
        <div className="w-full h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading spinner while redirecting (user not authenticated)
  if (!user) {
    return (
      <AppLayout 
        title="Redirecting..."
        withHeader={false} 
        fullHeight={false}
        fullWidth={true}
        className="px-0"
      >
        <div className="w-full h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading while fetching business data
  if (businessLoading) {
    return (
      <AppLayout 
        title="Loading..."
        withHeader={false} 
        fullHeight={false}
        fullWidth={true}
        className="px-0"
      >
        <div className="w-full h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading business details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error if business not found
  if (!business) {
    return (
      <AppLayout 
        title="Business Not Found"
        withHeader={false} 
        fullHeight={false}
        fullWidth={true}
        className="px-0"
      >
        <div className="w-full h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">Business not found</p>
            <Button onClick={handleGoBack}>Go Back</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={`Review ${business.name}`}
      withHeader={false} 
      fullHeight={false}
      fullWidth={true}
      className="px-0"
    >
      <div className="w-full pb-8 px-4 pt-4">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={handleGoBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        
        <Tabs defaultValue="review" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="review" className="flex-1">Write Review</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">View Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="review" className="w-full">
            <Card className={`${isMobile ? 'mt-4' : 'mt-8'} w-full`}>
              <CardHeader>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-md overflow-hidden">
                    <img 
                      src={business.image} 
                      alt={business.name} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'public/placeholder.svg';
                      }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{business.name}</CardTitle>
                    <div className="flex flex-col items-start mt-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(business.rating || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm ml-1">{(business.rating || 0).toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({business.totalReviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Your Rating</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <StarIcon
                          className={`h-8 w-8 ${
                            star <= (hoverRating || rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {rating > 0 ? (
                      <span className="font-medium">
                        {rating === 5 ? "Excellent! " : rating === 4 ? "Great! " : rating === 3 ? "Good. " : rating === 2 ? "Fair. " : "Poor. "}
                        {rating === 1 
                          ? "We're sorry to hear about your experience." 
                          : rating <= 3 
                          ? "Thank you for your feedback."
                          : "We're glad you enjoyed your experience!"}
                      </span>
                    ) : (
                      "Tap a star to rate"
                    )}
                  </p>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Your Review (optional)</h3>
                  <Textarea
                    placeholder="Share your experience with this business..."
                    className="min-h-32"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleGoBack}>Cancel</Button>
                  <Button onClick={handleSubmitReview}>Submit Review</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comments" className="w-full">
            <CommentSection businessId={business.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Review;
