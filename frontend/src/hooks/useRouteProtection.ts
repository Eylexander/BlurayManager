import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

interface RouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string; // Default is '/login' if not authenticated, or '/dashboard' if authenticated but not allowed
}

// Route path constants
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    INSTALL: '/auth/install',
  },
  DASHBOARD: {
    HOME: '/dashboard',
    SETTINGS: '/dashboard/settings',
    STATISTICS: '/dashboard/statistics',
    ADD: {
      ADD: '/dashboard/add',
      SEARCH: '/dashboard/add/search',
      RESULTS: '/dashboard/add/results',
      SCAN: '/dashboard/add/scan',
    },
    IMPORT_EXPORT: '/dashboard/import-export',
    USERS: '/dashboard/users',
    BLURAYS: {
      DETAIL: '/dashboard/blurays/[id]',
    },
    TAGS: '/dashboard/tags',
  },
} as const;

const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  // Public pages (no auth required)
  [ROUTES.HOME]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  [ROUTES.AUTH.LOGIN]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  [ROUTES.AUTH.REGISTER]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  [ROUTES.AUTH.FORGOT_PASSWORD]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
  [ROUTES.AUTH.INSTALL]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },

  // Dashboard (all authenticated users)
  [ROUTES.DASHBOARD.HOME]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },

  // Settings - User role gets limited version, Guest/User can't see certain settings
  [ROUTES.DASHBOARD.SETTINGS]: { allowedRoles: ['admin', 'moderator', 'user'] }, // Guest can't access settings
  
  // Statistics - Only authenticated non-guest users
  [ROUTES.DASHBOARD.STATISTICS]: { allowedRoles: ['admin', 'moderator', 'user'] }, // Guest can't access statistics

  // Collection Management - Admin and Moderator only
  [ROUTES.DASHBOARD.ADD.ADD]: { allowedRoles: ['admin', 'moderator'] },
  [ROUTES.DASHBOARD.ADD.SEARCH]: { allowedRoles: ['admin', 'moderator'] },
  [ROUTES.DASHBOARD.ADD.RESULTS]: { allowedRoles: ['admin', 'moderator'] },
  [ROUTES.DASHBOARD.ADD.SCAN]: { allowedRoles: ['admin', 'moderator'] },

  // Import/Export - Admin only
  [ROUTES.DASHBOARD.IMPORT_EXPORT]: { allowedRoles: ['admin'] },

  // Tag Management - Admin only
  [ROUTES.DASHBOARD.TAGS]: { allowedRoles: ['admin'] },

  // Users management - Admin only
  [ROUTES.DASHBOARD.USERS]: { allowedRoles: ['admin'] },

  // Details page - All authenticated users
  [ROUTES.DASHBOARD.BLURAYS.DETAIL]: { allowedRoles: ['admin', 'moderator', 'user', 'guest'] },
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
