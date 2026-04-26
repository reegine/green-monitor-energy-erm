import { QueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "../services/backend";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 10_000,
      gcTime: 5 * 60_000,
    },
  },
});