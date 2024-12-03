/**
 * 响应式工具提示组件
 * 基于Chakra UI的Tooltip组件封装，增加了移动端的点击支持
 */

import {
  Tooltip as ChakraTooltip,
  type TooltipProps,
  useOutsideClick,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';

// click to open toolips on mobiles

/**
 * 组件属性接口
 * 继承自Chakra UI的TooltipProps，并添加必需的children属性
 * @interface Props
 * @extends {TooltipProps}
 * @property {React.ReactNode} children - 触发工具提示的子元素
 */
interface Props extends TooltipProps {
  children: React.ReactNode;
}

/**
 * 响应式工具提示组件
 * 功能：
 * 1. 继承Chakra UI Tooltip的所有功能
 * 2. 支持移动端点击触发提示
 * 3. 点击外部区域自动关闭提示
 * 4. 使用button包装子元素以支持点击事件
 */
export const Tooltip = (props: Props) => {
  // 控制提示的显示状态
  const [isOpen, setIsOpen] = useState(false);
  // 引用提示容器元素
  const ref = useRef<HTMLDivElement | null>(null);

  // 监听外部点击事件以关闭提示
  useOutsideClick({
    ref: ref,
    handler: () => setIsOpen(false),
  });

  return (
    <ChakraTooltip
      ref={ref}
      isOpen={isOpen}
      label={props.label}
      onClose={() => setIsOpen(false)}
      onOpen={() => setIsOpen(true)}
      {...props}
    >
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
        onClick={() => setIsOpen(true)}
      >
        {props.children}
      </button>
    </ChakraTooltip>
  );
};
