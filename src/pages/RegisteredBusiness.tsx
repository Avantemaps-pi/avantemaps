
import React, { useState, useEffect } from 'react';
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
  const { isAuthenticated, login, user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  
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

      try {
        console.log('🏢 Fetching businesses for user:', user.uid);

        // Check Supabase session first (RLS requires it to view own businesses)
        const { data: sessionResp } = await supabase.auth.getSession();
        const sessionUserId = sessionResp?.session?.user?.id;
        console.log('🔐 Supabase session user:', sessionUserId || 'none');

        let rows: any[] | null = null;

        if (sessionUserId) {
          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', user.uid);

          if (error) {
            console.error('❌ Error fetching businesses:', error);
            throw error;
          }
          rows = data ?? [];
        } else {
          // Fallback: use Edge Function scoped by owner_id when no session is present
          console.warn('⚠️ No Supabase session – using secure fallback');
          const { data: fnData, error: fnError } = await supabase.functions.invoke('list-user-businesses', {
            body: { owner_id: user.uid }
          });
          if (fnError) {
            console.error('❌ Edge function error:', fnError);
            throw fnError;
          }
          rows = (fnData as any)?.businesses ?? [];
        }

        console.log('✅ Businesses fetched:', rows?.length || 0, 'businesses');

        if (!rows || rows.length === 0) {
          console.log('⚠️ No businesses found. Check:');
          console.log('  - owner_id in businesses table matches user uid:', user.uid);
          console.log('  - Supabase session exists (for RLS):', await supabase.auth.getSession());
        }

        // Transform to Business type - build address from components
        const transformedBusinesses: Business[] = (rows || []).map((b: any) => {
          const addressParts = [
            b.street_address,
            b.city,
            b.state,
            b.postal_code,
            b.country
          ].filter(Boolean);
          const address = addressParts.join(', ');

          return {
            id: b.id,
            name: b.name,
            address: address || b.location || '',
            description: b.description || '',
            isCertified: b.is_certified,
            isVerified: b.is_verified,
            category: b.category,
            coordinates: b.coordinates,
            business_types: b.business_types,
            keywords: b.keywords,
            created_at: b.created_at
          } as any;
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
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserBusinesses();
    } else {
      console.log('🔒 User not authenticated, skipping business fetch');
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
