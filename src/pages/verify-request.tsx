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
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { EmailIcon } from '@/svg/email';

export default function VerifyRequest() {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10分钟有效期
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const storedEmail = localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      // 邮箱统一小写处理
      const normalizedEmail = storedEmail.toLowerCase().trim();
      setEmail(normalizedEmail);
      // 更新localStorage中的邮箱为规范化格式
      localStorage.setItem('emailForSignIn', normalizedEmail);
    } else {
      // 如果没有存储的邮箱，说明用户直接访问了这个页面
      router.push('/');
    }
  }, [router]);

  // 验证码有效期倒计时
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
      // 验证码过期，显示提示
      setVerificationError('验证码已过期，请重新发送验证码。');
    }
    return undefined;
  }, [timeLeft]);

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

  const verifyOTP = async (value: string) => {
    if (isVerifying || !value || value.length !== 6) return;

    // 基本的输入验证
    const token = value.trim();
    if (!/^\d{6}$/.test(token)) {
      setVerificationError('请输入6位数字验证码');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      // 使用CredentialsProvider验证OTP
      const result = await signIn('otp', {
        email,
        code: token,
        redirect: false,
      });

      if (result?.error) {
        // 处理验证错误
        handleVerificationError(result.error);
        return;
      }

      if (result?.ok) {
        // 验证成功，跳转到首页或指定页面
        window.location.href = '/';
      }

    } catch (error) {
      console.error('Verification error:', error);
      setIsVerifying(false);
      setVerificationError('网络错误，请稍后重试');
    }
  };

  // 验证错误码到用户文案的映射
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'invalid_code':
        return '验证码不正确，请重新输入';
      case 'invalid_or_expired_code':
        return '验证码无效或已过期，请重新获取';
      case 'expired_code':
        return '验证码已过期，请重新获取';
      case 'user_blocked':
        return '该邮箱已被屏蔽，请联系管理员';
      case 'verification_failed':
        return '验证失败，请稍后重试';
      case 'invalid_credentials':
        return '请输入正确的邮箱和验证码';
      default:
        return '验证码不正确，请重新输入';
    }
  };

  // 解析频率限制中的剩余时间
  const parseRateLimitInfo = (error: string): { remaining: number; message: string } => {
    const match = error.match(/RATE_LIMITED:(\d+)/);
    if (match) {
      const remaining = parseInt(match[1]);
      return {
        remaining,
        message: `请求过于频繁，请 ${remaining} 秒后重试`,
      };
    }
    return {
      remaining: 60, // 默认60秒
      message: '请求过于频繁，请稍后再试',
    };
  };

  // 发送邮件错误码到用户文案的映射
  const getSendErrorMessage = (errorCode: string): { message: string; remaining?: number } => {
    if (errorCode.startsWith('RATE_LIMITED')) {
      const { remaining, message } = parseRateLimitInfo(errorCode);
      return { message, remaining };
    }

    switch (errorCode) {
      case 'BLOCKED_EMAIL':
        return { message: '该邮箱暂不可用，请更换邮箱或联系管理员' };
      case 'EmailSignin':
        return { message: '邮件发送失败，请稍后重试' };
      default:
        return { message: '发送验证码失败，请稍后重试' };
    }
  };

  const handleVerificationError = (errorCode?: string) => {
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    setOtpValue(''); // 清空输入框
    setIsVerifying(false);

    if (newErrorCount >= 5) {
      // 5次错误后提供明确的下一步指引
      setVerificationError(
        '验证尝试次数过多，请选择以下方式：\n' +
        '• 等待 10 分钟后重新尝试\n' +
        '• 更换其他邮箱地址\n' +
        '• 检查垃圾邮件文件夹\n' +
        '• 联系客服获取帮助'
      );
      
      // 10秒后跳转到主页
      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 10000);
    } else {
      // 根据错误码显示对应的错误信息
      let errorMessage = errorCode ? getErrorMessage(errorCode) : '验证码不正确，请重新输入';
      
      if (newErrorCount > 1) {
        errorMessage += `。剩余尝试次数：${5 - newErrorCount}`;
      }
      
      setVerificationError(errorMessage);
      
      // 3秒后清除错误提示（但保留错误计数）
      setTimeout(() => {
        setVerificationError('');
      }, 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleResendCode = async () => {
    if (!canResend || resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setResendCooldown(60); // 60秒冷却时间
    setTimeLeft(10 * 60); // 重置10分钟倒计时
    setCanResend(false);
    setVerificationError('');
    setOtpValue(''); // 清空输入框
    setErrorCount(0); // 重置错误计数

    try {
      // 使用NextAuth的signIn方法重新发送验证码
      const result = await signIn('email', { 
        email, 
        redirect: false 
      });

      if (result?.error) {
        // 处理发送错误
        const errorInfo = getSendErrorMessage(result.error);
        setVerificationError(errorInfo.message);
        
        // 如果是频率限制，使用服务端返回的剩余时间
        if (errorInfo.remaining) {
          setResendCooldown(errorInfo.remaining);
        } else if (!result.error.startsWith('RATE_LIMITED')) {
          setResendCooldown(0);
        }
      } else {
        setVerificationError('新的验证码已发送到您的邮箱');
        // 3秒后清除成功消息
        setTimeout(() => {
          setVerificationError('');
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      setVerificationError('发送验证码失败，请稍后重试');
      setResendCooldown(0); // 重置冷却时间
    } finally {
      setResendLoading(false);
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
            <Alert
              borderRadius="md"
              status={
                verificationError.includes('已发送') ? 'success' : 'error'
              }
            >
              <AlertIcon />
              <Text fontSize="sm">{verificationError}</Text>
            </Alert>
          )}

          <Box pos="relative">
            <Flex justify="center" gap={1.5}>
              <PinInput
                autoFocus
                colorScheme={verificationError ? 'red' : 'purple'}
                focusBorderColor={
                  verificationError ? 'red.500' : 'brand.purple'
                }
                isDisabled={isVerifying || timeLeft === 0 || errorCount >= 5}
                onChange={setOtpValue}
                onComplete={verifyOTP}
                otp
                size={'lg'}
                value={otpValue}
              >
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                />
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                />
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                />
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                />
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                />
                <PinInputField
                  inputMode="numeric"
                  autoComplete="one-time-code"
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

          <VStack w="full" spacing={3}>
            <Text color="#64748B" fontSize="sm" textAlign="center">
              {timeLeft > 0 ? (
                <>
                  验证码将在 <strong>{formatTime(timeLeft)}</strong> 后过期
                </>
              ) : (
                '验证码已过期'
              )}
            </Text>

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

            <Text maxW="sm" color="#94A3B8" fontSize="xs" textAlign="center">
              请检查您的邮箱（包括垃圾邮件文件夹）。如果您多次点击了重发，任何一个有效的验证码都可以使用。
            </Text>
          </VStack>
        </VStack>
      </Flex>
    </>
  );
}
