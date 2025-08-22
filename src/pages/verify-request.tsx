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
  PinInput,
  PinInputField,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { EmailIcon } from '@/svg/email';

export default function VerifyRequest() {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [otpValue, setOtpValue] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedEmail = localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // 如果没有存储的邮箱，说明用户直接访问了这个页面
      router.push('/');
    }
  }, [router]);

  // 倒计时逻辑
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
      // 验证码过期，跳转回登录页面
      setVerificationError('验证码已过期，请重新登录获取新的验证码。');
      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 5000);
    }
    return undefined;
  }, [timeLeft, router]);

  // 重发验证码冷却时间
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const verifyOTP = async (value: string) => {
    if (isVerifying || !value || value.length !== 6) return;

    setIsVerifying(true);
    setVerificationError('');

    try {
      const token = value.trim();
      const encodedEmail = encodeURIComponent(email);

      // 使用 fetch 来检查验证结果，而不是直接跳转
      const response = await fetch(
        `/api/auth/callback/email?token=${token}&email=${encodedEmail}`,
        {
          method: 'GET',
          redirect: 'manual', // 阻止自动重定向
        },
      );

      // 检查响应状态
      if (response.status === 200 || response.status === 0) {
        // 验证成功，跳转
        router.push(
          `/api/auth/callback/email?token=${token}&email=${encodedEmail}`,
        );
      } else {
        // 验证失败
        handleVerificationError();
      }
    } catch (error) {
      // 网络错误或其他错误
      handleVerificationError();
    }
  };

  const handleVerificationError = () => {
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    setOtpValue(''); // 清空输入框
    setIsVerifying(false);

    if (newErrorCount >= 5) {
      // 5次错误后跳转回登录页面
      setVerificationError('验证码错误次数过多，请重新登录获取新的验证码。');
      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 3000);
    } else {
      // 显示错误提示，允许重试
      setVerificationError(
        `验证码错误，请重新输入。剩余尝试次数：${5 - newErrorCount}`,
      );
    }
  };

  const handleResendCode = async () => {
    if (!canResend || resendCooldown > 0) return;

    setResendCooldown(60); // 60 seconds cooldown
    setTimeLeft(30 * 60); // Reset timer
    setCanResend(false);
    setVerificationError('');
    setErrorCount(0); // 重置错误计数
    setOtpValue(''); // 清空输入框

    try {
      // 重新发送验证码请求
      const response = await fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirect: false,
        }),
      });

      if (response.ok) {
        setVerificationError('新的验证码已发送到您的邮箱。');
        // 3秒后清除成功消息
        setTimeout(() => {
          setVerificationError('');
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      setVerificationError('发送验证码失败，请稍后重试。');
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
              我们刚刚发送了一次性密码
            </Heading>
            <Text color="#475569" fontSize={{ base: 'lg', md: '20' }}>
              到您的邮箱 {email}
            </Text>
          </VStack>

          <Circle bg="#EEF2FF" size={32}>
            <EmailIcon />
          </Circle>

          {verificationError && (
            <Alert borderRadius="md" status="error">
              <AlertIcon />
              <Text fontSize="sm">{verificationError}</Text>
            </Alert>
          )}

          <VStack w="full" spacing={4}>
            <Box pos="relative">
              <Flex justify="center" gap={1.5}>
                <PinInput
                  autoFocus
                  colorScheme={verificationError ? 'red' : 'purple'}
                  focusBorderColor={
                    verificationError ? 'red.500' : 'brand.purple'
                  }
                  isDisabled={isVerifying || errorCount >= 5}
                  onChange={setOtpValue}
                  onComplete={verifyOTP}
                  otp
                  size={'lg'}
                  value={otpValue}
                >
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                  <PinInputField
                    borderColor={verificationError ? 'red.400' : 'gray.400'}
                  />
                </PinInput>
              </Flex>
              {isVerifying && (
                <Flex
                  pos="absolute"
                  top="0"
                  right="0"
                  bottom="0"
                  left="0"
                  align="center"
                  justify="center"
                  bg="rgba(255, 255, 255, 0.8)"
                >
                  <Spinner color="purple.500" />
                </Flex>
              )}
            </Box>

            <Text color="#64748B" fontSize="sm" textAlign="center">
              {timeLeft > 0 ? (
                <>
                  验证码将在 <strong>{formatTime(timeLeft)}</strong> 后过期
                </>
              ) : (
                '验证码已过期'
              )}
            </Text>

            <VStack w="full" spacing={2}>
              <Button
                w="full"
                isDisabled={!canResend || resendCooldown > 0}
                onClick={handleResendCode}
                size="sm"
                variant="outline"
              >
                {resendCooldown > 0
                  ? `重新发送 (${resendCooldown}s)`
                  : '重新发送验证码'}
              </Button>

              <Button
                w="full"
                onClick={() => router.push('/')}
                size="sm"
                variant="ghost"
              >
                返回首页
              </Button>
            </VStack>
          </VStack>

          <Text maxW="sm" color="#94A3B8" fontSize="xs" textAlign="center">
            请检查您的邮箱（包括垃圾邮件文件夹）。如果仍未收到邮件，请点击重新发送。
          </Text>
        </VStack>
      </Flex>
    </>
  );
}
