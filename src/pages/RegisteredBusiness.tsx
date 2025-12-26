
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import BusinessCard from '@/components/business/BusinessCard';
import BusinessSelector from '@/components/business/BusinessSelector';
import EmptyBusinessState from '@/components/business/EmptyBusinessState';
import BusinessHeader from '@/components/business/BusinessHeader';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { Business } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const RegisteredBusiness = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user, refreshUserData } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const toastShownRef = useRef(false);
  const hasFetchedRef = useRef(false);
  
  // Get newly registered business ID from navigation state
  const newBusinessId = (location.state as { newBusinessId?: number })?.newBusinessId;

  // Fetch user's businesses from database
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      if (!user?.uid) {
        console.log('🏢 No user UID, skipping business fetch');
        setIsLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (hasFetchedRef.current) {
        console.log('🏢 Skipping duplicate fetch');
        return;
      }
      hasFetchedRef.current = true;

      try {
        console.log('🏢 Fetching businesses for user:', user.uid);

        // ✅ SECURITY: Get Supabase session and use session.user.id for consistency
        const getSessionUserId = async () => {
          const { data: sessionResp } = await supabase.auth.getSession();
          return sessionResp?.session?.user?.id;
        };

        let sessionUserId = await getSessionUserId();
        console.log('🔐 Supabase session user (initial):', sessionUserId || 'none');

        // As a last resort, try a full login once if still missing and online
        if (!sessionUserId && navigator.onLine) {
          try {
            console.log('🔑 No session after refresh — attempting login() to restore session');
            await login();
            sessionUserId = await getSessionUserId();
            console.log('🔐 Supabase session user (after login):', sessionUserId || 'none');
          } catch (e) {
            console.warn('⚠️ Login attempt failed:', e);
          }
        }

        if (!sessionUserId) {
          console.error('❌ No valid Supabase session found');
          if (!toastShownRef.current) {
            toast.error('Please log in to view your businesses');
            toastShownRef.current = true;
          }
          hasFetchedRef.current = false;
          setIsLoading(false);
          return;
        }

        // ✅ SECURITY: Verify session user matches the authenticated Pi user
        if (sessionUserId !== user.uid) {
          console.error("🚨 Security warning: Session user mismatch", {
            sessionUserId,
            piUserId: user.uid
          });
          toast.error("Authentication mismatch. Please log in again.");
          setIsLoading(false);
          return;
        }

        // Use direct Supabase query with RLS (most secure approach)
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', sessionUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching businesses:', error);
          throw error;
        }

        const rows = data ?? [];
        console.log('✅ Businesses fetched:', rows.length, 'businesses');

        // ✅ SECURITY: Runtime validation - filter out any businesses not owned by user
        const validRows = rows.filter((b: any) => {
          if (b.owner_id !== sessionUserId) {
            console.error('🚨 Security warning: Business owner mismatch detected', {
              businessId: b.id,
              businessOwnerId: b.owner_id,
              sessionUserId
            });
            return false;
          }
          return true;
        });

        if (validRows.length !== rows.length) {
          console.warn(`⚠️ Filtered out ${rows.length - validRows.length} invalid businesses`);
        }

        // Transform to Business type - build address from components
        const transformedBusinesses: Business[] = validRows.map((b: any) => {
          const addressParts = [
            b.street_address,
            b.city,
            b.state,
            b.zip_code,
            b.country
          ].filter(Boolean);
          const address = addressParts.join(', ');

          return {
            id: b.id,
            name: b.business_name,
            address: address || b.location || '',
            description: b.business_description || '',
            isCertified: b.is_certified,
            isVerified: b.is_verified,
            verificationStatus: b.verification_status,
            // Extended fields
            streetAddress: b.street_address,
            city: b.city,
            state: b.state,
            zipCode: b.zip_code,
            country: b.country,
            businessTypes: b.business_types,
            keywords: b.keywords,
            category: b.category,
            coordinates: b.coordinates,
            contactInfo: b.contact_info,
            hours: b.hours,
            piWalletAddress: b.pi_wallet_address,
            images: b.images,
            lat: b.lat,
            lng: b.lng,
          };
        });

        setBusinesses(transformedBusinesses);

        // Auto-select newly registered business if present in state
        if (newBusinessId && transformedBusinesses.some(b => b.id === newBusinessId)) {
          setSelectedBusinessId(String(newBusinessId));
          toast.success('Your business has been registered successfully!');
          navigate('.', { replace: true, state: {} });
        }
      } catch (error) {
        console.error('❌ Error in fetchUserBusinesses:', error);
        toast.error('Failed to load your businesses');
        hasFetchedRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserBusinesses();
    } else {
      console.log('🔒 User not authenticated, skipping business fetch');
      hasFetchedRef.current = false;
      setIsLoading(false);
    }
  }, [user?.uid, isAuthenticated]);

  // Filter businesses by selected business ID - default to showing all
  const filteredBusinesses = selectedBusinessId === 'all'
    ? businesses
    : businesses.filter(business => business.id.toString() === selectedBusinessId);

  const handleEditBusiness = (businessId: number) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      navigate(`/update-registration/${businessId}`, { 
        state: { business }
      });
    }
  };

  // Handle login button click
  const handleLoginClick = () => {
    login();
  };

  if (!isAuthenticated) {
    return (
      <AppLayout title="Avante Maps">
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900">
              Sign In to View Your Businesses
            </h2>
            <p className="mt-6 text-xl text-gray-500">
              Please log in to view and manage your registered businesses on Avante Maps.
            </p>
            <div className="mt-8">
              <Button 
                onClick={handleLoginClick}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xl py-6 px-12 rounded-md"
                size="lg"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <AppLayout title="Avante Maps">
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <BusinessHeader 
            title="My Businesses" 
            subtitle="Manage your Pi business" 
            showButton={false}
          />
          <div className="space-y-6 mt-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Avante Maps">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <BusinessHeader 
          title="My Businesses" 
          subtitle="Manage your Pi business" 
          showButton={false}
        />

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div>
            <Button onClick={() => navigate('/registration')}>Register New Business</Button>
            
            {businesses.length > 0 && (
              <div className="mt-4">
                <BusinessSelector 
                  businesses={businesses} 
                  selectedBusinessId={selectedBusinessId} 
                  onSelect={setSelectedBusinessId} 
                />
              </div>
            )}
          </div>
        </div>

        {businesses.length === 0 ? (
          <EmptyBusinessState />
        ) : filteredBusinesses.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-white rounded-md shadow-sm">
            <p>Select a business from the dropdown to view its details</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBusinesses.map((business) => (
              <BusinessCard 
                key={business.id} 
                business={business}
                onEdit={() => handleEditBusiness(business.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RegisteredBusiness;
