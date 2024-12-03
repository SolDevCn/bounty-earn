/**
 * 项目方注册按钮组件
 * 用于引导用户以项目方身份进行注册或登录
 */

import { Alert, AlertIcon, Button } from '@chakra-ui/react';

/**
 * SponsorButton组件
 * @param {object} props - 组件属性
 * @param {boolean} [props.showMessage] - 是否显示登录提示消息
 * @param {boolean} [props.isLoading] - 是否显示加载状态
 * @param {() => void} props.checkSponsor - 点击按钮时的回调函数
 * 
 * 功能：
 * 1. 显示"以项目方身份贡献"按钮
 * 2. 支持加载状态显示
 * 3. 可选显示登录提示警告
 * 4. 使用深色主题（slate.900）
 */
export function SponsorButton({
  showMessage,
  isLoading,
  checkSponsor,
}: {
  showMessage?: boolean;
  isLoading?: boolean;
  checkSponsor: () => void;
}) {
  return (
    <>
      {/* 登录提示警告 */}
      {!!showMessage && (
        <Alert mb={4} status="warning">
          <AlertIcon />
          Please log in to continue!
        </Alert>
      )}
      {/* 项目方注册按钮 */}
      <Button
        w={'full'}
        h={12}
        color={'white'}
        bg={'brand.slate.900'}
        _hover={{ bg: 'brand.slate.700' }}
        isLoading={!!isLoading}
        loadingText=""
        onClick={() => checkSponsor()}
        rounded="4px"
      >
        以项目方身份贡献 {'->'}
      </Button>
    </>
  );
}
