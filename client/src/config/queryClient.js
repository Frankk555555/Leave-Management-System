import { QueryClient } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
    },
  },
});

export default queryClient;
