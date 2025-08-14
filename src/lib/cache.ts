import { QueryClient } from '@tanstack/react-query';

// Cache configuration constants
export const CACHE_TIMES = {
  // Real-time data that needs frequent updates
  REALTIME: 5 * 1000, // 5 seconds (increased from 1s to reduce refetches)
  FAST: 10 * 1000, // 10 seconds (increased from 2s to reduce refetches)
  NORMAL: 30 * 1000, // 30 seconds (increased from 5s)
  
  // Data that changes less frequently
  SLOW: 2 * 60 * 1000, // 2 minutes (increased from 30s)
  LONG: 10 * 60 * 1000, // 10 minutes (increased from 5m)
  
  // Static data that rarely changes
  STATIC: 60 * 60 * 1000, // 1 hour (increased from 30m)
} as const;

// Cache garbage collection times
export const GC_TIMES = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

// Refetch intervals for background updates
export const REFETCH_INTERVALS = {
  REALTIME: 10 * 1000, // 10 seconds (increased to reduce background refetches)
  FAST: 30 * 1000, // 30 seconds (increased from 10s)
  NORMAL: 60 * 1000, // 1 minute (increased from 30s)
  SLOW: 5 * 60 * 1000, // 5 minutes (increased from 1m)
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
  SUBMISSION_DETAILS: (submissionId: string) => ['submission-details', submissionId] as const,
  
  // Sponsor Dashboard
  SPONSOR_SUBMISSIONS: (slug: string, isHackathon?: boolean) => 
    ['sponsor-submissions', slug, isHackathon] as const,
  SPONSOR_DASHBOARD: (slug: string) => ['sponsor-dashboard', slug] as const,
  SPONSOR_STATS: (slug: string) => ['sponsor-stats', slug] as const,
  SPONSOR_LISTINGS: (slug: string) => ['sponsor-listings', slug] as const,
  
  // Applications
  GRANT_APPLICATIONS: (slug: string) => ['grant-applications', slug] as const,
  GRANT_APPLICATION: (applicationId: string) => ['grant-application', applicationId] as const,
  
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
    refetchIntervalInBackground: false, // Disabled to reduce background load
  },
  
  // Fast updating data
  FAST: {
    staleTime: CACHE_TIMES.FAST,
    gcTime: GC_TIMES.MEDIUM,
    refetchInterval: REFETCH_INTERVALS.FAST,
    refetchIntervalInBackground: false, // Disabled to reduce background load
  },
  
  // Normal data
  NORMAL: {
    staleTime: CACHE_TIMES.NORMAL,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: true, // Only refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  },
  
  // Slow changing data
  SLOW: {
    staleTime: CACHE_TIMES.SLOW,
    gcTime: GC_TIMES.LONG,
    refetchOnWindowFocus: false, // No automatic refetch
    refetchOnReconnect: true, // Only refetch on reconnect
  },
  
  // Static data
  STATIC: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
    refetchOnWindowFocus: false, // No automatic refetch
    refetchOnReconnect: false, // No refetch on reconnect
  },
  
  // User-specific data (more conservative)
  USER: {
    staleTime: CACHE_TIMES.NORMAL,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  
  // Submission data (critical for user experience)
  SUBMISSION: {
    staleTime: CACHE_TIMES.FAST,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
    // Also invalidate user submission status for this listing
    queryClient.invalidateQueries({ 
      queryKey: ['user-submission'],
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return queryKey.includes(slug);
      }
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
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SPONSOR_LISTINGS(slug) 
    });
    // Also invalidate listing data since it's related
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.LISTING(slug) 
    });
  },
  
  // Invalidate submission-related queries
  SUBMISSION: (queryClient: QueryClient, submissionId: string, listingSlug?: string) => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.SUBMISSION_DETAILS(submissionId) 
    });
    if (listingSlug) {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.LISTING_SUBMISSIONS({ slug: listingSlug }) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.SUBMISSION_COUNT(listingSlug) 
      });
      // Also invalidate sponsor dashboard submissions
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(listingSlug, false) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(listingSlug, true) 
      });
    }
  },
  
  // Invalidate grant application queries
  GRANT_APPLICATION: (queryClient: QueryClient, slug: string, applicationId?: string) => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.GRANT_APPLICATIONS(slug) 
    });
    if (applicationId) {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.GRANT_APPLICATION(applicationId) 
      });
    }
  },
  
  // Global invalidate all dashboard data
  ALL_DASHBOARD: (queryClient: QueryClient, slug: string) => {
    CACHE_INVALIDATION.SPONSOR_DASHBOARD(queryClient, slug);
    CACHE_INVALIDATION.LISTING(queryClient, slug);
  },
} as const;