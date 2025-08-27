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
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getNetworkErrorMessage,
  getOtpErrorMessage,
  getSendErrorMessage,
} from '@/lib/auth/errorHandling';
import { EmailIcon } from '@/svg/email';

// 🚀 强化版：解决所有边界情况和用户体验问题
export default function VerifyRequest() {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();
  const inFlightRef = useRef(false);

  const canResend =
    cooldown === 0 &&
    !resendLoading &&
    !isVerifying &&
    !inFlightRef.current;

  // 🎯 简化：只在关键时点查询服务端状态
  const fetchOtpStatus = useCallback(async () => {
    if (!email) return;

    try {
      const response = await fetch(
        `/api/auth/otp-status?email=${encodeURIComponent(email)}`,
      );
      const result = await response.json();

      if (result.success) {
        setCooldown(result.data.retry);
      }
    } catch (error) {
      console.error('OTP status fetch error:', error);
    }
  }, [email]);

  // 🎯 简化：页面初始化时查询状态
  useEffect(() => {
    if (email) {
      fetchOtpStatus();
    }
  }, [email, fetchOtpStatus]);

  // 🎯 页面初始化：获取邮箱
  useEffect(() => {
    const storedEmail = localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      const normalizedEmail = storedEmail.toLowerCase().trim();
      setEmail(normalizedEmail);
      localStorage.setItem('emailForSignIn', normalizedEmail);
    } else {
      router.push('/');
    }
  }, [router]);

  // 🎯 简化：单一倒计时定时器
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown > 0]);

  const verifyOTP = async (value: string) => {
    if (inFlightRef.current || isVerifying || !value || value.length !== 6)
      return;

    inFlightRef.current = true;

    const token = value.trim();
    if (!/^\d{6}$/.test(token)) {
      setVerificationError('请输入6位数字验证码');
      inFlightRef.current = false;
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    let result = null;
    try {
      result = await signIn('otp', {
        email,
        code: token,
        redirect: false,
      });

      if (result?.error) {
        handleVerificationError(result.error);
      } else if (result?.ok) {
        setVerificationError('验证成功，正在跳转...');
        localStorage.removeItem('emailForSignIn');

        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        handleVerificationError('unknown_error');
        // 🎯 关键时点：验证失败后查询服务端状态
        fetchOtpStatus();
      }
    } catch (error) {
      console.error('Network error during verification:', error);
      setVerificationError(getNetworkErrorMessage(error));
      // 🎯 关键时点：网络错误后也查询服务端状态
      fetchOtpStatus();
    } finally {
      setIsVerifying(false);
      if (!result?.ok) {
        inFlightRef.current = false;
      }
    }
  };

  const handleVerificationError = (errorCode?: string) => {
    setOtpValue('');
    setIsVerifying(false);

    // 🔒 优先检查服务端阻断
    if (errorCode?.startsWith('verification_blocked_')) {
      const errorMessage = getOtpErrorMessage(errorCode);
      setVerificationError(errorMessage);
      
      // 服务端阻断时禁用输入并在错误消息显示后返回首页
      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 15000);
      return;
    }

    // 前端错误计数（作为备选保护）
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);

    if (newErrorCount >= 5) {
      setVerificationError(
        '验证尝试次数过多，请选择以下方式：\n\n' +
          '• 等待 10 分钟后重新尝试\n' +
          '• 更换其他邮箱地址\n' +
          '• 检查垃圾邮件文件夹\n' +
          '• 联系客服获取帮助',
      );

      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 10000);
    } else {
      let errorMessage = errorCode
        ? getOtpErrorMessage(errorCode)
        : '验证码不正确，请重新输入';

      if (newErrorCount > 1) {
        errorMessage += `。剩余尝试次数：${5 - newErrorCount}`;
      }

      setVerificationError(errorMessage);

      setTimeout(() => {
        setVerificationError('');
      }, 10000);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setResendLoading(true);
    setVerificationError('');
    setOtpValue('');
    setErrorCount(0);

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
      });

      if (result?.error) {
        const errorInfo = getSendErrorMessage(result.error);
        setVerificationError(errorInfo.message);
      } else {
        setVerificationError('新的验证码已发送到您的邮箱');

        setTimeout(() => {
          setVerificationError('');
        }, 10000);
      }
    } catch (error) {
      console.error('Network error during resend:', error);
      setVerificationError(`发送验证码失败：${getNetworkErrorMessage(error)}`);
    } finally {
      setResendLoading(false);
      // 🎯 关键时点：重发后查询服务端状态（无论成功失败）
      fetchOtpStatus();
    }
  };

  const getResendButtonText = () => {
    if (cooldown > 0) {
      return `重新发送 (${cooldown}s)`;
    }
    if (resendLoading) {
      return '发送中...';
    }
    return '重新发送验证码';
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
                verificationError.includes('已发送') ||
                verificationError.includes('验证成功')
                  ? 'success'
                  : 'error'
              }
            >
              <AlertIcon />
              <Text fontSize="sm" whiteSpace="pre-line">
                {verificationError}
              </Text>
            </Alert>
          )}

          <Box pos="relative">
            <Flex justify="center" gap={1.5}>
              {(() => {
                const isServerBlocked = verificationError?.includes('验证尝试次数过多，请') && 
                                      verificationError?.includes('分钟后重试');
                const shouldDisable =
                  isVerifying || inFlightRef.current || errorCount >= 5 || isServerBlocked;

                return (
                  <PinInput
                    autoFocus
                    colorScheme={verificationError ? 'red' : 'purple'}
                    focusBorderColor={
                      verificationError ? 'red.500' : 'brand.purple'
                    }
                    isDisabled={shouldDisable}
                    onChange={setOtpValue}
                    onComplete={(value) => {
                      if (!shouldDisable) {
                        verifyOTP(value);
                      }
                    }}
                    otp
                    size={'lg'}
                    value={otpValue}
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <PinInputField
                        key={index}
                        borderColor={verificationError ? 'red.400' : 'gray.400'}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            otpValue.length === 6 &&
                            !shouldDisable
                          ) {
                            e.preventDefault();
                            verifyOTP(otpValue);
                          }
                        }}
                      />
                    ))}
                  </PinInput>
                );
              })()}
            </Flex>
            {(isVerifying || inFlightRef.current) && (
              <Flex
                pos="absolute"
                top="0"
                right="0"
                bottom="0"
                left="0"
                align="center"
                justify="center"
                direction="column"
                gap={2}
                bg="rgba(255, 255, 255, 0.9)"
              >
                <Spinner color="purple.500" size="lg" />
                <Text color="purple.600" fontSize="sm" fontWeight="medium">
                  正在验证...
                </Text>
              </Flex>
            )}
          </Box>

          <VStack w="full" spacing={3}>
            <Text color="#64748B" fontSize="sm" textAlign="center">
              请输入收到的6位验证码
            </Text>

            <Button
              w="full"
              isDisabled={!canResend || errorCount >= 5 || (verificationError?.includes('验证尝试次数过多，请') && verificationError?.includes('分钟后重试'))}
              isLoading={resendLoading}
              onClick={handleResendCode}
              size="sm"
              variant="outline"
            >
              {getResendButtonText()}
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
