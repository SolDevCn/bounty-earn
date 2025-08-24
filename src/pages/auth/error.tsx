import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Circle,
  Flex,
  Heading,
  Image,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { EmailIcon } from '@/svg/email';

// NextAuth 错误类型映射
const errorMessages: Record<
  string,
  { title: string; description: string; action: string }
> = {
  Verification: {
    title: '验证失败',
    description:
      '验证码无效或已过期。请返回重新输入验证码，或重新发送新的验证码。',
    action: '返回验证页面',
  },
  AccessDenied: {
    title: '访问被拒绝',
    description: '您没有权限访问此资源。请联系管理员或使用其他账户登录。',
    action: '返回首页',
  },
  Configuration: {
    title: '配置错误',
    description: '认证服务配置有误。请稍后再试或联系技术支持。',
    action: '返回首页',
  },
  Default: {
    title: '认证错误',
    description: '登录过程中出现了未知错误。请稍后重试或联系技术支持。',
    action: '返回首页',
  },
};

export default function AuthError() {
  const router = useRouter();
  const [errorType, setErrorType] = useState('Default');

  useEffect(() => {
    const { error } = router.query;
    if (error && typeof error === 'string') {
      setErrorType(errorMessages[error] ? error : 'Default');
    }
  }, [router.query]);

  const errorInfo = errorMessages[errorType] || errorMessages.Default;

  const handleAction = () => {
    if (errorType === 'Verification') {
      // 验证错误返回验证页面
      router.push('/verify-request');
    } else {
      // 其他错误返回首页
      router.push('/');
    }
  };

  return (
    <>
      <Box py={3} borderBottomWidth={2}>
        <Link as={NextLink} mx="auto" href="/">
          <Image
            h={6}
            mx="auto"
            cursor="pointer"
            objectFit={'contain'}
            alt={'Solar Earn'}
            onClick={() => {
              router.push('/');
            }}
            src={'/assets/logo/logo-light.png'}
          />
        </Link>
      </Box>
      <Flex
        align="center"
        justify="center"
        direction="column"
        minH="70vh"
        px={3}
      >
        <VStack w="full" maxW="md" spacing={6}>
          <VStack textAlign="center" spacing={3}>
            <Heading color="#1E293B" fontSize={{ base: '2xl', md: '28' }}>
              {errorInfo?.title || '认证错误'}
            </Heading>
            <Text color="#475569" fontSize={{ base: 'lg', md: '20' }}>
              认证过程中发生了错误
            </Text>
          </VStack>

          <Circle bg="#FEF2F2" size={32}>
            <EmailIcon />
          </Circle>

          <Alert borderRadius="md" status="error">
            <AlertIcon />
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                {errorInfo?.description || '登录过程中出现了未知错误。'}
              </Text>
            </Box>
          </Alert>

          <VStack w="full" spacing={3}>
            <Button
              w="full"
              colorScheme="purple"
              onClick={handleAction}
              size="lg"
            >
              {errorInfo?.action || '返回首页'}
            </Button>

            <Button
              w="full"
              onClick={() => router.push('/')}
              size="sm"
              variant="ghost"
            >
              返回首页
            </Button>

            <Text maxW="sm" color="#94A3B8" fontSize="xs" textAlign="center">
              如果问题持续存在，请联系技术支持团队。
            </Text>
          </VStack>
        </VStack>
      </Flex>
    </>
  );
}
