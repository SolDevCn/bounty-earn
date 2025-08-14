import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import { CACHE_INVALIDATION, QUERY_KEYS } from '@/lib/cache';
import { useFormSubmission } from '@/hooks/useApi';

interface SubmissionData {
  listingId: string;
  link?: string;
  tweet?: string;
  otherInfo?: string;
  ask?: string | null;
  eligibilityAnswers?: Array<{ question: string; answer: string }> | null;
}

export function useSubmission(listingId: string, editMode = false) {
  const queryClient = useQueryClient();

  const mutation = useFormSubmission({
    mutationFn: async (data: SubmissionData) => {
      const submissionEndpoint = editMode
        ? '/api/submission/update/'
        : '/api/submission/create/';
      
      const response = await axios.post(submissionEndpoint, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all relevant caches
      CACHE_INVALIDATION.LISTING(queryClient, listingId);
      
      // Show success message
      toast.success(editMode ? '提交已更新' : '提交成功');
    },
    invalidateQueries: [
      QUERY_KEYS.USER_SUBMISSION(listingId, 'current'),
      QUERY_KEYS.SUBMISSION_COUNT(listingId),
    ],
    showSuccessToast: false, // We handle it manually
    showErrorToast: true,
    successMessage: editMode ? '提交已更新' : '提交成功',
    errorMessage: '提交失败，请重试',
  });

  return {
    ...mutation,
    submitSubmission: mutation.handleSubmit,
    isSubmitting: mutation.isPending,
  };
}