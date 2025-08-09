import { SubmissionStatus } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';

import { type SubmissionWithUser } from '@/interface/submission';

import { selectedSubmissionAtom, selectedSubmissionIdsAtom } from '..';

export const useRejectSubmissions = (slug: string) => {
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
      await queryClient.cancelQueries({ queryKey: ['sponsor-submissions', slug] });
      
      // Snapshot the previous value
      const previousSubmissions = queryClient.getQueryData<SubmissionWithUser[]>(['sponsor-submissions', slug]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['sponsor-submissions', slug], (old: any) => {
        if (!old) return old;
        return old.map((submission: SubmissionWithUser) =>
          submissionIds.includes(submission.id)
            ? {
                ...submission,
                status: SubmissionStatus.Rejected,
              }
            : submission,
        );
      });

      // Update selected submission
      const updatedSubmission = previousSubmissions?.find((submission) => 
        submissionIds.includes(submission.id)
      );
      setSelectedSubmission(updatedSubmission);
      setSelectedSubmissionIds(new Set());
      
      // Return a context object with the snapshotted value
      return { previousSubmissions };
    },
    onError: (error, _, context) => {
      toast.error('失败，请重试');
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSubmissions) {
        queryClient.setQueryData(['sponsor-submissions', slug], context.previousSubmissions);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch the latest data
      queryClient.invalidateQueries({ queryKey: ['sponsor-submissions', slug] });
      toast.success('成功');
    },
  });
};
