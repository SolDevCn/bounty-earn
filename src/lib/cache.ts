import { QueryClient } from '@tanstack/react-query';

// Cache configuration constants
export const CACHE_TIMES = {
  // Real-time data that needs frequent updates
  REALTIME: 1000, // 1 second
  FAST: 2 * 1000, // 2 seconds
  NORMAL: 5 * 1000, // 5 seconds
  
  // Data that changes less frequently
  SLOW: 30 * 1000, // 30 seconds
  LONG: 5 * 60 * 1000, // 5 minutes
  
  // Static data that rarely changes
  STATIC: 30 * 60 * 1000, // 30 minutes
} as const;

// Cache garbage collection times
export const GC_TIMES = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

// Refetch intervals for background updates
export const REFETCH_INTERVALS = {
  REALTIME: 5 * 1000, // 5 seconds
  FAST: 10 * 1000, // 10 seconds
  NORMAL: 30 * 1000, // 30 seconds
  SLOW: 60 * 1000, // 1 minute
} as const;

// Query key patterns for consistent cache management
export const QUERY_KEYS = {
  // User-related
  USER: ['user'] as const,
  USER_SUBMISSION: (listingId: string, userId: string) => 
    ['user-submission', listingId, userId] as const,
  
  // Listings
  LISTING: (slug: string) => ['listing', slug] as const,
  LISTING_SUBMISSIONS: (params: { slug: string; isWinner?: boolean }) => 
    ['listing-submissions', params] as const,
  SUBMISSION_COUNT: (slug: string) => ['submission-count', slug] as const,
  
  // Sponsor Dashboard
  SPONSOR_SUBMISSIONS: (slug: string, isHackathon?: boolean) => 
    ['sponsor-submissions', slug, isHackathon] as const,
  SPONSOR_DASHBOARD: (slug: string) => ['sponsor-dashboard', slug] as const,
  SPONSOR_STATS: (slug: string) => ['sponsor-stats', slug] as const,
  
  // Applications
  GRANT_APPLICATIONS: (slug: string) => ['grant-applications', slug] as const,
  
  // OG Images (for link previews)
  OG_IMAGE: (url: string) => ['og-image', url] as const,
} as const;

// Default query options for different data types
export const QUERY_OPTIONS = {
  // Real-time data that needs immediate updates
  REALTIME: {
    staleTime: CACHE_TIMES.REALTIME,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: REFETCH_INTERVALS.REALTIME,
    refetchIntervalInBackground: true,
  },
  
  // Fast updating data
  FAST: {
    staleTime: CACHE_TIMES.FAST,
    gcTime: GC_TIMES.MEDIUM,
    refetchInterval: REFETCH_INTERVALS.FAST,
    refetchIntervalInBackground: true,
  },
  
  // Normal data
  NORMAL: {
    staleTime: CACHE_TIMES.NORMAL,
    gcTime: GC_TIMES.MEDIUM,
  },
  
  // Slow changing data
  SLOW: {
    staleTime: CACHE_TIMES.SLOW,
    gcTime: GC_TIMES.LONG,
  },
  
  // Static data
  STATIC: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  },
} as const;

// Create a pre-configured QueryClient
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.NORMAL,
      gcTime: GC_TIMES.MEDIUM,
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 errors
        if (error?.status === 404 || error?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 errors
        if (error?.status === 404 || error?.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

// Cache invalidation helpers
export const CACHE_INVALIDATION = {
  // Invalidate all user-related queries
  USER: (queryClient: QueryClient, userId?: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER });
    if (userId) {
      queryClient.removeQueries({ 
        queryKey: ['user-submission'],
        type: 'inactive',
      });
    }
  },
  
  // Invalidate listing-related queries
  LISTING: (queryClient: QueryClient, slug: string) => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.LISTING(slug) 
    });
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.LISTING_SUBMISSIONS({ slug }) 
    });
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SUBMISSION_COUNT(slug) 
    });
  },
  
  // Invalidate sponsor dashboard queries
  SPONSOR_DASHBOARD: (queryClient: QueryClient, slug: string) => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false) 
    });
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true) 
    });
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SPONSOR_DASHBOARD(slug) 
    });
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SPONSOR_STATS(slug) 
    });
  },
} as const;