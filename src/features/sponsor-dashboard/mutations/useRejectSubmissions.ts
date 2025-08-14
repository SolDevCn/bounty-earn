import { SubmissionStatus } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';

import { CACHE_INVALIDATION, QUERY_KEYS } from '@/lib/cache';
import { type SubmissionWithUser } from '@/interface/submission';

import { selectedSubmissionAtom, selectedSubmissionIdsAtom } from '..';

export const useRejectSubmissions = (slug: string, isHackathon?: boolean) => {
  const queryClient = useQueryClient();
  const setSelectedSubmission = useSetAtom(selectedSubmissionAtom);
  const setSelectedSubmissionIds = useSetAtom(selectedSubmissionIdsAtom);

  return useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const batchSize = 10;
      for (let i = 0; i < submissionIds.length; i += batchSize) {
        const batch = submissionIds.slice(i, i + batchSize);
        await axios.post(`/api/sponsor-dashboard/submission/reject`, {
          data: batch.map((a) => ({ id: a })),
        });
      }
    },
    onMutate: async (submissionIds) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false),
      });
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true),
      });

      // Snapshot the previous value
      const previousSubmissionsFalse = queryClient.getQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false),
      );
      const previousSubmissionsTrue = queryClient.getQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true),
      );

      // Optimistically update to the new value
      queryClient.setQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false),
        (old) =>
          old?.map((submission) =>
            submissionIds.includes(submission.id)
              ? {
                  ...submission,
                  status: SubmissionStatus.Rejected,
                }
              : submission,
          ),
      );
      
      queryClient.setQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true),
        (old) =>
          old?.map((submission) =>
            submissionIds.includes(submission.id)
              ? {
                  ...submission,
                  status: SubmissionStatus.Rejected,
                }
              : submission,
          ),
      );

      const updatedSubmission = queryClient
        .getQueryData<SubmissionWithUser[]>(QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, isHackathon ?? false))
        ?.find((submission) => submissionIds.includes(submission.id));

      setSelectedSubmission(updatedSubmission);
      setSelectedSubmissionIds(new Set());

      return { previousSubmissionsFalse, previousSubmissionsTrue };
    },
    onSuccess: (_, submissionIds) => {
      // Show success message
      toast.success(`已拒绝 ${submissionIds.length} 个提交`);

      // Invalidate all dashboard data to ensure consistency
      CACHE_INVALIDATION.ALL_DASHBOARD(queryClient, slug);

      // Update local state
      const updatedSubmission = queryClient
        .getQueryData<SubmissionWithUser[]>(QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, isHackathon ?? false))
        ?.find((submission) => submissionIds.includes(submission.id));

      setSelectedSubmission(updatedSubmission);
      setSelectedSubmissionIds(new Set());
    },
    onError: (error, submissionIds, context) => {
      console.error('Failed to reject submissions:', error);
      
      // Rollback to the previous value
      if (context?.previousSubmissionsFalse !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false),
          context.previousSubmissionsFalse,
        );
      }
      if (context?.previousSubmissionsTrue !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true),
          context.previousSubmissionsTrue,
        );
      }
      
      toast.error('操作失败，请重试');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, false),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, true),
      });
    },
  });
};
