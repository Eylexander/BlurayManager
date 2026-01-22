import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

interface RouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string; // Default is '/login' if not authenticated, or '/dashboard' if authenticated but not allowed
}

const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  // Public pages (no auth required)
  '/': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  '/auth/login': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  '/auth/register': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  '/auth/forgot-password': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  '/auth/install': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },

  // Dashboard (all authenticated users)
  '/dashboard': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },

  // Settings - User role gets limited version, Guest/User can't see certain settings
  '/dashboard/settings': { allowedRoles: ['admin', 'moderator', 'user'] }, // Guest can't access settings
  
  // Statistics - Only authenticated non-guest users
  '/dashboard/statistics': { allowedRoles: ['admin', 'moderator', 'user'] }, // Guest can't access statistics

  // Collection Management - Admin and Moderator only
  '/dashboard/add': { allowedRoles: ['admin', 'moderator'] },
  '/dashboard/blurays/[id]/edit': { allowedRoles: ['admin', 'moderator'] },

  // Import/Export - Admin only
  '/dashboard/import-export': { allowedRoles: ['admin'] },

  // Users management - Admin only
  '/dashboard/users': { allowedRoles: ['admin'] },

  // Details page - All authenticated users
  '/dashboard/blurays/[id]': { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
};

export function useRouteProtection(pathname: string, isPublicPage: boolean = false) {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const protectRoute = async () => {
      // Ensure auth state is up to date
      if (!isAuthenticated && !isPublicPage) {
        await checkAuth();
      }

      // Find matching route config
      let config: RouteConfig | null = null;
      
      // Try exact match first
      if (ROUTE_CONFIGS[pathname]) {
        config = ROUTE_CONFIGS[pathname];
      } else {
        // Try pattern matching for dynamic routes
        for (const [pattern, patternConfig] of Object.entries(ROUTE_CONFIGS)) {
          if (pattern.includes('[') && pattern.includes(']')) {
            // Convert pattern to regex
            const regexPattern = pattern
              .replace(/\[.*?\]/g, '[^/]+')
              .replace(/\//g, '\\/')
              .replace(/\[/g, '(')
              .replace(/\]/g, ')');
            
            if (new RegExp(`^${regexPattern}$`).test(pathname)) {
              config = patternConfig;
              break;
            }
          }
        }
      }

      // If no config found, allow access (public page)
      if (!config) {
        return;
      }

      // Check if user is authenticated (for non-public pages)
      if (!isAuthenticated && !config.allowedRoles.includes('guest')) {
        router.replace('/auth/login');
        return;
      }

      // Check role permissions
      const userRole = (user?.role as UserRole) || 'guest';
      if (!config.allowedRoles.includes(userRole)) {
        router.replace(config.redirectTo || '/dashboard');
        return;
      }
    };

    protectRoute();
  }, [pathname, isAuthenticated, user?.role, router, checkAuth, isPublicPage]);
}

export default useRouteProtection;
