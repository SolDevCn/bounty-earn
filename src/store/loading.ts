import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface LoadingState {
  // Global loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  errorStates: Record<string, string | null>;
  
  // Actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  reset: () => void;
}

const initialState = {
  globalLoading: false,
  loadingStates: {},
  errorStates: {},
};

export const useLoadingStore = create<LoadingState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setGlobalLoading: (loading) => {
          set({ globalLoading: loading });
        },
        
        setLoading: (key, loading) => {
          set((state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: loading,
            },
          }));
        },
        
        setError: (key, error) => {
          set((state) => ({
            errorStates: {
              ...state.errorStates,
              [key]: error,
            },
          }));
        },
        
        clearError: (key) => {
          set((state) => ({
            errorStates: {
              ...state.errorStates,
              [key]: null,
            },
          }));
        },
        
        clearAllErrors: () => {
          set({ errorStates: {} });
        },
        
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'loading-storage',
        partialize: (state) => ({
          errorStates: state.errorStates,
        }),
      }
    ),
    { name: 'loading-store' }
  )
);

// Custom hooks for specific loading scenarios
export const useGlobalLoading = () => {
  const globalLoading = useLoadingStore((state) => state.globalLoading);
  const setGlobalLoading = useLoadingStore((state) => state.setGlobalLoading);
  
  return { globalLoading, setGlobalLoading };
};

export const useLoadingState = (key: string) => {
  const loading = useLoadingStore((state) => state.loadingStates[key] || false);
  const error = useLoadingStore((state) => state.errorStates[key] || null);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const setError = useLoadingStore((state) => state.setError);
  const clearError = useLoadingStore((state) => state.clearError);
  
  return { loading, error, setLoading, setError, clearError };
};

// Higher-order component for loading states
export const withLoadingState = (key: string, Component: React.ComponentType<any>) => {
  return (props: any) => {
    const { loading, error, setLoading, setError, clearError } = useLoadingState(key);
    
    return (
      <Component
        {...props}
        loading={loading}
        error={error}
        setLoading={setLoading}
        setError={setError}
        clearError={clearError}
      />
    );
  };
};