/**
 * 自动调整大小的文本域组件
 * 基于Chakra UI的Textarea和react-textarea-autosize
 * 实现根据内容自动调整高度的文本输入框
 */

import { Textarea, type TextareaProps } from '@chakra-ui/react';
import React from 'react';
import ResizeTextarea from 'react-textarea-autosize';

/**
 * AutoResizeTextarea组件
 * 功能：
 * 1. 继承Chakra UI的Textarea所有属性
 * 2. 根据输入内容自动调整高度
 * 3. 隐藏溢出内容
 * 4. 禁用手动调整大小
 * 5. 最小行数为1
 * 
 * @component
 * @param {TextareaProps} props - Chakra UI Textarea的属性
 * @param {React.Ref<HTMLTextAreaElement>} ref - 文本域的引用
 */
// eslint-disable-next-line react/display-name
export const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>((props, ref) => (
  <Textarea
    ref={ref}
    as={ResizeTextarea}
    overflow="hidden"
    w="100%"
    minH={props.minH ?? 'unset'}
    resize="none"
    minRows={1}
    {...props}
  />
));
