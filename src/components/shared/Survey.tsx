// 导入必要的UI组件和依赖
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalContent,
  ModalOverlay,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import axios from 'axios';
import { type Survey, type SurveyQuestion } from 'posthog-js';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';

import { useUser } from '@/store/user';

// 根据ID查找匹配的调查问卷
function getMatchingSurvey(surveys: Survey[], id: string): Survey | null {
  const survey = surveys.find((survey) => survey.id === id);
  return survey || null;
}

// 调查问卷模态框组件
export const SurveyModal = ({
  isOpen,                   // 是否显示模态框
  onClose,                  // 关闭模态框的回调函数
  surveyId,                // 调查问卷ID
}: {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
}) => {
  const { refetchUser } = useUser();
  const posthog = usePostHog();

  // 状态管理
  const [question, setQuestion] = useState<SurveyQuestion | undefined | null>(
    null,
  );                       // 当前问题
  const [response, setResponse] = useState<string | number>();     // 用户回答
  const [isSubmitting, setIsSubmitting] = useState(false);        // 提交状态

  // 处理评分类型问题的回答
  const handleRating = (rate: number) => {
    setResponse(rate);
  };

  // 处理单选类型问题的回答
  const handleChoiceSelection = (choice: string) => {
    setResponse(choice);
  };

  // 提交问卷回答
  const handleSubmit = async () => {
    setIsSubmitting(true);
    // 记录用户回答
    posthog.capture('survey sent', {
      $survey_id: surveyId,
      $survey_response: response,
    });
    // 更新用户的调查问卷状态
    await axios.post('/api/user/update-survey/', {
      surveyId,
    });
    await refetchUser();
    setIsSubmitting(false);
    onClose();
  };

  // 获取调查问卷数据
  useEffect(() => {
    posthog.getActiveMatchingSurveys((surveys) => {
      const surveyById = getMatchingSurvey(surveys, surveyId);
      setQuestion(surveyById?.questions[0]);
    }, true);
  }, [posthog]);

  return (
    <Modal
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <ModalOverlay />
      <ModalContent p={6}>
        {/* 问卷加载状态 */}
        {!question ? (
          <Box>
            <Skeleton h="18px" mb={2} />
            <Skeleton w="60%" h="14px" mb={5} />
            <Flex justify="center" gap={1} mt={8}>
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} w="40px" h="36px" />
              ))}
            </Flex>
            <Skeleton h="10" mt={8} mb={3} borderRadius={'3'} />
          </Box>
        ) : (
          <>
            <Box>
              {/* 问题标题和描述 */}
              <Text
                mb={2}
                color="brand.slate.700"
                fontSize="lg"
                fontWeight={600}
                lineHeight={'125%'}
              >
                {question?.question}
              </Text>
              <Text mb={5} color="brand.slate.500" fontSize="sm">
                {question?.description}
              </Text>
              {/* 评分类型问题 */}
              {question?.type === 'rating' && (
                <Box>
                  {/* 评分按钮组 */}
                  <Flex justify="center" gap={4} mt={2}>
                    {[...Array(question.scale)].map((_, i) => (
                      <Button
                        key={i}
                        onClick={() => handleRating(i + 1)}
                        size={'sm'}
                        variant={response === i + 1 ? 'solid' : 'outline'}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </Flex>
                  {/* 评分说明 */}
                  <Flex justify={'space-between'} flexGrow={1} mt={0.5}>
                    <Text color="brand.slate.400" fontSize="xs">
                      {question.lowerBoundLabel}
                    </Text>
                    <Text color="brand.slate.400" fontSize="xs">
                      {question.upperBoundLabel}
                    </Text>
                  </Flex>
                </Box>
              )}
              {/* 单选类型问题 */}
              {question?.type === 'single_choice' && (
                <RadioGroup
                  mb={3}
                  onChange={(value) => handleChoiceSelection(value)}
                  value={response !== undefined ? String(response) : undefined}
                >
                  <Stack direction="column">
                    {question.choices.map((choice, idx) => (
                      <Radio
                        key={idx}
                        _hover={{ bg: 'brand.slate.100' }}
                        colorScheme="purple"
                        name="memberType"
                        size="md"
                        value={choice}
                      >
                        {choice}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              )}
            </Box>
            {/* 提交按钮 */}
            <Button
              mt={4}
              isDisabled={!response}
              isLoading={isSubmitting}
              loadingText="正在提交"
              onClick={handleSubmit}
            >
              提交
            </Button>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
