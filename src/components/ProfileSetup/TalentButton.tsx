/**
 * 人才注册按钮组件
 * 用于引导用户以人才身份进行注册或登录
 */

import { Alert, AlertIcon, Button, Link } from '@chakra-ui/react';

/**
 * TalentButton组件
 * @param {object} props - 组件属性
 * @param {boolean} [props.showMessage] - 是否显示登录提示消息
 * @param {boolean} [props.isLoading] - 是否显示加载状态
 * @param {() => void} props.checkTalent - 点击按钮时的回调函数
 * 
 * 功能：
 * 1. 显示"以人才身份贡献"按钮
 * 2. 支持加载状态显示
 * 3. 可选显示登录提示警告
 * 4. 使用品牌紫色作为主色调
 */
export function TalentButton({
  showMessage,
  isLoading,
  checkTalent,
}: {
  showMessage?: boolean;
  isLoading?: boolean;
  checkTalent: () => void;
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
      {/* 人才注册按钮 */}
      <Link>
        <Button
          w={'full'}
          h={12}
          color={'white'}
          bg={'brand.purple.dark'}
          _hover={{ bg: 'brand.purple' }}
          isLoading={!!isLoading}
          onClick={() => checkTalent()}
          rounded="4px"
        >
          以人才身份贡献 {'->'}
        </Button>
      </Link>
    </>
  );
}
