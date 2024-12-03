/**
 * 加载动画组件
 * 显示一个居中的自定义加载动画
 * 使用CSS类 'earn-loader' 实现动画效果
 */

import { Flex } from '@chakra-ui/react';

/**
 * Loading组件
 * 渲染一个包含两个动画元素的加载指示器
 * 使用Chakra UI的Flex组件实现居中布局
 */
export function Loading() {
  return (
    <Flex align={'center'} justify="center">
      <div className="earn-loader">
        <div></div>
        <div></div>
      </div>
    </Flex>
  );
}
