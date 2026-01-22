'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import useRouteProtection from '@/hooks/useRouteProtection';
import { apiClient } from '@/lib/api-client';
import { Loader } from 'lucide-react';
import { LoaderCircle } from '@/components/common/LoaderCircle';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  // Use route protection
  useRouteProtection(pathname, true); // true = public page

  useEffect(() => {
    const initialize = async () => {
      // First check if setup is needed
      try {
        const data = await apiClient.checkAdminExists();
        
        if (data.needsSetup) {
          router.push('/install');
          return;
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
      }

      // Then check auth status
      await checkAuth();
      setChecking(false);
    };
    
    initialize();
  }, [checkAuth, router]);

  useEffect(() => {
    if (!checking) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, checking, router]);

  return (
    <LoaderCircle />
  );
}
