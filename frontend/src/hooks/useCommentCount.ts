import { useQuery } from '@tanstack/react-query';
import { commentAPI } from '@/lib/api';

/**
 * Hook to fetch comment count for a meal
 * Uses React Query caching to avoid redundant requests
 */
export function useCommentCount(planId: string, mealId: string) {
  const { data: commentsData } = useQuery({
    queryKey: ['comments', planId, mealId],
    queryFn: async () => {
      const response = await commentAPI.getComments(planId, mealId);
      return response.data.data.comments;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    count: commentsData?.length || 0,
    hasComments: (commentsData?.length || 0) > 0
  };
}
