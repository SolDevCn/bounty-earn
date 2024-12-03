/**
 * 步骤指示器组件
 * 用于显示多步骤流程中的单个步骤状态
 */

import { CheckIcon } from '@chakra-ui/icons';
import { Box, Flex, Text } from '@chakra-ui/react';
import React, { type Dispatch, type SetStateAction } from 'react';

/**
 * 组件属性接口
 * @interface Props
 * @property {number} currentStep - 当前激活的步骤
 * @property {number} thisStep - 当前组件代表的步骤编号
 * @property {string} label - 步骤标签文本
 * @property {string} [sublabel] - 可选的副标签文本
 * @property {Dispatch<SetStateAction<number>>} [setStep] - 可选的步骤状态设置函数
 */
interface Props {
  currentStep: number;
  thisStep: number;
  label: string;
  sublabel?: string;
  setStep?: Dispatch<SetStateAction<number>>;
}

/**
 * Steps组件
 * 功能：
 * 1. 显示步骤的完成状态（未开始/进行中/已完成）
 * 2. 支持点击已完成的步骤返回
 * 3. 根据状态显示不同的样式：
 *    - 已完成：紫色背景+对勾图标
 *    - 进行中：紫色背景+数字
 *    - 未开始：边框+灰色数字
 */
export const Steps = ({ currentStep, thisStep, label, setStep }: Props) => {
  /**
   * 处理步骤点击
   * 只有当前步骤号小于点击的步骤号时才能返回
   */
  const handleChange = () => {
    if (currentStep > thisStep && setStep) {
      setStep(thisStep);
    }
  };

  return (
    <Box
      pos="relative"
      alignItems={'center'}
      justifyContent={'center'}
      display={'flex'}
      h={'6rem'}
      cursor={currentStep > thisStep ? 'pointer' : 'default'}
      onClick={handleChange}
    >
      {/* 步骤圆圈 */}
      <Flex
        align={'center'}
        justify="center"
        w="2.3rem"
        h="2.3rem"
        color="white"
        bg={currentStep >= thisStep ? '#6562FF' : 'transparent'}
        border={currentStep > thisStep - 1 ? 'none' : '1px solid #94A3B8'}
        borderRadius="full"
      >
        {currentStep > thisStep ? (
          <CheckIcon color="white" />
        ) : (
          <Flex>
            <Text
              h="100%"
              color={currentStep === thisStep ? 'white' : 'brand.slate.500'}
              fontSize="1rem"
              textAlign="center"
            >
              {thisStep}
            </Text>
          </Flex>
        )}
      </Flex>
      {/* 步骤标签 */}
      <Text
        pos="absolute"
        bottom={0}
        alignItems={'center'}
        justifyContent={'center'}
        display={'flex'}
        w={'max-content'}
        color={currentStep === thisStep ? 'brand.purple' : 'brand.slate.500'}
        fontSize={{ base: '0.9rem', md: '1rem' }}
        fontWeight={currentStep === thisStep ? 600 : 500}
      >
        {label}
      </Text>
    </Box>
  );
};
