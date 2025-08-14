import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAtom } from 'jotai';
import { toast } from 'sonner';

import { BONUS_REWARD_POSITION } from '@/constants';
import { CACHE_INVALIDATION, QUERY_KEYS } from '@/lib/cache';
import { useApiMutation } from '@/hooks/useApi';
import { type Listing, type Rewards } from '@/features/listings';
import { type SubmissionWithUser } from '@/interface/submission';

import { selectedSubmissionAtom } from '..';

export const useToggleWinner = (
  bounty: Listing | undefined,
  submissions: SubmissionWithUser[],
  setRemainings: React.Dispatch<
    React.SetStateAction<{ podiums: number; bonus: number } | null>
  >,
  usedPositions: number[],
) => {
  const queryClient = useQueryClient();
  const [, setSelectedSubmission] = useAtom(selectedSubmissionAtom);

  return useMutation({
    mutationFn: async ({
      id,
      isWinner,
      winnerPosition,
    }: {
      id: string;
      isWinner: boolean;
      winnerPosition: number | null;
    }) => {
      const response = await axios.post(
        `/api/sponsor-dashboard/submission/toggle-winner/`,
        {
          id,
          isWinner,
          winnerPosition,
        },
      );
      if (!response.data) throw new Error('Failed to toggle winner');
      return response.data;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, false),
      });
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, true),
      });

      // Snapshot the previous value
      const previousSubmissionsFalse = queryClient.getQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, false),
      );
      const previousSubmissionsTrue = queryClient.getQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, true),
      );

      // Optimistically update to the new value
      queryClient.setQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, false),
        (old) =>
          old?.map((submission) =>
            submission.id === variables.id
              ? {
                  ...submission,
                  isWinner: variables.isWinner,
                  winnerPosition: variables.winnerPosition ?? undefined,
                }
              : submission,
          ),
      );
      
      queryClient.setQueryData<SubmissionWithUser[]>(
        QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, true),
        (old) =>
          old?.map((submission) =>
            submission.id === variables.id
              ? {
                  ...submission,
                  isWinner: variables.isWinner,
                  winnerPosition: variables.winnerPosition ?? undefined,
                }
              : submission,
          ),
      );

      return { previousSubmissionsFalse, previousSubmissionsTrue };
    },
    onSuccess: (data, variables) => {
      // Show success message
      toast.success(
        variables.isWinner 
          ? `已选为获胜者 ${variables.winnerPosition ? `(${variables.winnerPosition}等奖)` : ''}`
          : '已取消获胜者资格'
      );

      // Invalidate sponsor dashboard cache
      if (bounty?.slug) {
        CACHE_INVALIDATION.ALL_DASHBOARD(queryClient, bounty.slug);
      }

      // Update local state
      const submissionIndex = submissions.findIndex(
        (s) => s.id === variables.id,
      );
      if (submissionIndex >= 0) {
        const oldPosition: number =
          Number(submissions[submissionIndex]?.winnerPosition) || 0;
        const newPosition = variables.winnerPosition || 0;

        let newUsedPositions = [...usedPositions];
        if (oldPosition && oldPosition !== newPosition) {
          newUsedPositions = newUsedPositions.filter(
            (pos) => pos !== oldPosition,
          );
        }

        if (newPosition) {
          if (
            newPosition === BONUS_REWARD_POSITION &&
            newUsedPositions.filter((n) => n === BONUS_REWARD_POSITION).length <
              (bounty?.maxBonusSpots ?? 0)
          ) {
            newUsedPositions.push(newPosition);
          } else if (!newUsedPositions.includes(newPosition)) {
            newUsedPositions.push(newPosition);
          }
        }

        const updatedSubmission: SubmissionWithUser = {
          ...submissions[submissionIndex],
          isWinner: variables.isWinner,
          winnerPosition: variables.winnerPosition as keyof Rewards | undefined,
        } as SubmissionWithUser;

        setSelectedSubmission(updatedSubmission);

        setRemainings((prevRemainings) => {
          if (!prevRemainings) return prevRemainings;

          const newRemainings = { ...prevRemainings };
          const isNewPositionValid = !isNaN(newPosition) && newPosition !== 0;
          const isOldPositionValid = !isNaN(oldPosition) && oldPosition !== 0;

          if (isNewPositionValid) {
            if (newPosition === BONUS_REWARD_POSITION) {
              newRemainings.bonus--;
            } else {
              newRemainings.podiums--;
            }
          }

          if (isOldPositionValid) {
            if (oldPosition === BONUS_REWARD_POSITION) {
              newRemainings.bonus++;
            } else {
              newRemainings.podiums++;
            }
          }

          return newRemainings;
        });
      }
    },
    onError: (error, variables, context) => {
      console.error('Failed to toggle winner:', error);
      
      // Rollback to the previous value
      if (context?.previousSubmissionsFalse !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, false),
          context.previousSubmissionsFalse,
        );
      }
      if (context?.previousSubmissionsTrue !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, true),
          context.previousSubmissionsTrue,
        );
      }
      
      toast.error('操作失败，请重试');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      if (bounty?.slug) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, false),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(bounty?.slug!, true),
        });
      }
    },
  });
};
