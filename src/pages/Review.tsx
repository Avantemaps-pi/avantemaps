
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

const Review = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const isMobile = useIsMobile();
  
  // Use business data from state if available, otherwise use fallback
  const businessDetails = location.state?.businessDetails;
  
  // Fallback business data if not passed through navigation
  const business = businessDetails || {
    id: businessId || "1",
    name: "Pi Tech Hub",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=2020&auto=format&fit=crop",
    category: "Technology",
    currentRating: 4.5,
    totalReviews: 42
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast.error("Please select a rating before submitting");
      return;
    }
    
    // In a real app, this would submit to a backend
    toast.success("Review submitted successfully!", {
      description: `You gave ${business.name} a ${rating}-star rating.`
    });
    
    // Navigate back to business page
    setTimeout(() => navigate(-1), 1500);
  };

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
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        
        <Tabs defaultValue="review" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="review" className="flex-1">Write Review</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">View Comments</TabsTrigger>
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
                              i < Math.floor(business.rating || business.currentRating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm ml-1">{(business.rating || business.currentRating).toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({business.totalReviews} reviews)
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
                  <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
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
