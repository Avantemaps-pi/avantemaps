import { useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';

export const useAdminAccess = () => {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  return { isAdmin, isLoading };
};
