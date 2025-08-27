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
  // 移除了timeLeft，不再显示验证码有效期倒计时
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isInFlight, setIsInFlight] = useState(false); // 🔒 飞行锁：防止重复提交
  // 移除了serverTimeOffset，当前不需要客户端时间同步
  const router = useRouter();

  // 状态查询相关接口
  interface OtpStatusData {
    canSend: boolean;
    canVerify: boolean;
    resendCooldownSeconds: number;
    tokenExpireSeconds: number;
    serverTimestamp: number;
    message: string;
  }

  // 查询验证码状态
  const fetchOtpStatus = async (): Promise<OtpStatusData | null> => {
    if (!email) return null;

    try {
      const response = await fetch(
        `/api/auth/otp-status?email=${encodeURIComponent(email)}`,
      );
      const result = await response.json();

      if (result.success) {
        // 移除了时间偏移计算，当前只需要状态数据
        return result.data;
      } else {
        console.error('Failed to fetch OTP status:', result.error);
        return null;
      }
    } catch (error) {
      console.error('OTP status query error:', error);
      return null;
    }
  };

  // 刷新状态并更新UI
  const refreshStatus = async () => {
    const status = await fetchOtpStatus();
    if (status) {
      setResendCooldown(status.resendCooldownSeconds);
      setCanResend(status.canSend);

      // 如果验证码已过期，显示提示
      if (!status.canVerify && status.tokenExpireSeconds === 0) {
        setVerificationError('验证码已过期，请重新获取');
      }
    }
  };

  // 移除了getServerTime函数，当前不需要

  useEffect(() => {
    const storedEmail = localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      // 邮箱统一小写处理
      const normalizedEmail = storedEmail.toLowerCase().trim();
      setEmail(normalizedEmail);
      // 更新localStorage中的邮箱为规范化格式
      localStorage.setItem('emailForSignIn', normalizedEmail);

      // 页面加载时立即获取最新状态
      setTimeout(() => {
        refreshStatus();
      }, 100); // 稍微延迟，确保状态已设置
    } else {
      // 如果没有存储的邮箱，说明用户直接访问了这个页面
      router.push('/');
    }
  }, [router]);

  // 智能状态同步策略 - 基于冷却时间动态调整频率
  useEffect(() => {
    if (!email) return;

    let syncInterval: NodeJS.Timeout;

    const setupSyncInterval = () => {
      // 清除现有定时器
      if (syncInterval) clearInterval(syncInterval);

      // 根据冷却剩余时间决定同步频率
      let interval = 30000; // 默认30秒

      if (resendCooldown > 0) {
        if (resendCooldown <= 3) {
          // 最后3秒：每秒同步，确保精确
          interval = 1000;
        } else if (resendCooldown <= 10) {
          // 最后10秒：每3秒同步
          interval = 3000;
        } else if (resendCooldown <= 30) {
          // 最后30秒：每10秒同步
          interval = 10000;
        }
        // 超过30秒：保持默认30秒同步
      }

      syncInterval = setInterval(async () => {
        await refreshStatus();
      }, interval);
    };

    // 初始化同步
    setupSyncInterval();

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [email, resendCooldown]); // 当冷却时间变化时重新设置间隔

  // 重新发送冷却倒计时 + 智能状态刷新
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          const newValue = Math.max(0, prev - 1);
          
          // 倒计时结束时主动触发状态刷新
          if (prev > 0 && newValue === 0) {
            setCanResend(true);
            // 延迟500ms刷新状态，确保服务端状态已更新
            setTimeout(() => {
              refreshStatus();
            }, 500);
          }
          
          return newValue;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
    // 显式返回undefined以满足TypeScript要求
    return undefined;
  }, [resendCooldown]);

  const verifyOTP = async (value: string) => {
    // 🛡️ 飞行锁防重复提交
    if (isVerifying || isInFlight || !value) return;

    // 🔧 宽松的输入验证 - 自动清理非数字字符
    const token = value.replace(/\D/g, ''); // 移除所有非数字字符
    
    if (token.length !== 6) {
      setVerificationError('请输入6位数字验证码');
      return;
    }

    // 🔒 启用飞行锁
    setIsInFlight(true);
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
        // 验证成功，显示成功消息并平滑跳转
        setVerificationError('验证成功，正在跳转...');
        
        // 清除存储的邮箱信息
        localStorage.removeItem('emailForSignIn');
        
        // 使用Next.js路由进行SPA跳转，保持应用状态
        setTimeout(() => {
          router.push('/');
        }, 1500); // 给用户1.5秒看到成功消息
        return; // 🔒 成功时不释放飞行锁，防止重复操作
      }
    } catch (error) {
      // 🔧 增强网络错误处理
      console.error('Network error during verification:', error);
      setIsVerifying(false);
      
      // 根据错误类型提供具体的用户提示
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setVerificationError('网络连接异常，请检查网络后重试');
      } else if (error instanceof Error && error.message.includes('timeout')) {
        setVerificationError('请求超时，请重试或检查网络连接');
      } else if (error instanceof Error && error.message.includes('abort')) {
        setVerificationError('请求被中断，请重试');
      } else {
        setVerificationError('验证过程出现异常，请重试或刷新页面');
      }
    } finally {
      // 🔓 失败情况下，3秒后释放飞行锁
      if (isInFlight) {
        setTimeout(() => {
          setIsInFlight(false);
        }, 3000);
      }
    }
  };

  // 🔧 精确的验证错误码到用户友好文案的映射
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'invalid_code':
        return '验证码不正确，请检查输入的6位数字是否与邮件中的验证码一致';
      case 'expired_code':
        return '验证码已过期（有效期10分钟），请点击"重新发送验证码"获取新的验证码';
      case 'invalid_or_expired_code':
        return '验证码无效或已过期，请点击"重新发送验证码"获取新的验证码';
      case 'user_blocked':
        return '该邮箱暂时不可用，请更换其他邮箱或联系客服';
      case 'verification_failed':
        return '验证过程出现异常，请稍后重试或刷新页面重新开始';
      case 'invalid_credentials':
        return '验证信息有误，请确认邮箱和验证码都正确';
      default:
        return '验证码输入有误。提示：请确保输入邮件中收到的完整6位数字验证码';
    }
  };

  // 解析频率限制中的剩余时间
  const parseRateLimitInfo = (
    error: string,
  ): { remaining: number; message: string } => {
    const match = error.match(/RATE_LIMITED:(\d+)/);
    if (match && match[1]) {
      const remaining = parseInt(match[1], 10);
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

  // 智能重发按钮文案 - 基于验证码状态动态显示
  const getResendButtonText = () => {
    if (resendCooldown > 0) {
      return `重新发送 (${resendCooldown}s)`;
    }
    
    if (resendLoading) {
      return '发送中...';
    }
    
    // 🎁 特殊提示：如果刚发生 verification_failed
    if (verificationError.includes('验证异常') || verificationError.includes('免冷却')) {
      return '🆘 立即重发验证码'; // 特殊标识
    }
    
    // 根据验证码状态提供智能提示
    if (!canResend) {
      return '验证码已过期，稍等可重发'; // 在30s容差期内的状态
    }
    
    return '重新发送验证码';
  };

  // 发送邮件错误码到用户文案的映射
  const getSendErrorMessage = (
    errorCode: string,
  ): { message: string; remaining?: number } => {
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
    
    // 🔓 释放飞行锁（3秒后）
    if (isInFlight) {
      setTimeout(() => {
        setIsInFlight(false);
      }, 3000);
    }

    if (newErrorCount >= 5) {
      // 5次错误后提供明确的下一步指引
      setVerificationError(
        '验证尝试次数过多，为保护账户安全，请稍后重试：\n\n' +
          '📧 检查邮箱中是否有新的验证码\n' +
          '🔄 等待10分钟后重新尝试\n' +
          '📂 查看垃圾邮件文件夹\n' +
          '✉️ 或更换其他邮箱地址',
      );

      // 10秒后跳转到主页
      setTimeout(() => {
        localStorage.removeItem('emailForSignIn');
        router.push('/');
      }, 10000);
    } else {
      // 🔧 根据错误码显示精确的错误信息
      let errorMessage = errorCode ? getErrorMessage(errorCode) : '验证码输入有误，请重新检查';

      // 🩹 特殊处理 verification_failed
      if (errorCode === 'verification_failed') {
        errorMessage = 
          '验证过程出现异常，这可能是网络问题导致的。\n\n' +
          '💡 建议：点击"重新发送验证码"获取新的验证码后重试\n\n' +
          '✨ 提示：由于验证异常，您可以立即重新发送验证码，无需等待冷却时间';
      } else if (errorCode === 'expired_code') {
        errorMessage += '\n\n💡 提示：验证码从发送时开始计算10分钟有效期';
      } else if (errorCode === 'invalid_code') {
        errorMessage += '\n\n💡 提示：请确保输入的是最新收到的验证码';
      }

      if (newErrorCount > 1) {
        errorMessage += `\n\n剩余尝试次数：${5 - newErrorCount}`;
      }

      setVerificationError(errorMessage);

      // 根据错误类型决定清除时间
      const clearTimeout = errorCode === 'expired_code' ? 15000 : 10000;
      setTimeout(() => {
        setVerificationError('');
      }, clearTimeout);
    }
  };


  const handleResendCode = async () => {
    // 如果按钮显示可点击但实际上还在冷却，先刷新状态
    if (!canResend || resendLoading) return;
    
    if (resendCooldown > 0) {
      // 冷却中但用户点击了，可能是状态不同步，立即刷新
      await refreshStatus();
      return;
    }

    setResendLoading(true);
    setVerificationError('');
    setOtpValue(''); // 清空输入框
    setErrorCount(0); // 重置错误计数

    try {
      // 使用NextAuth的signIn方法重新发送验证码
      const result = await signIn('email', {
        email,
        redirect: false,
      });

      // 不管成功还是失败，都查询最新状态
      await refreshStatus();

      if (result?.error) {
        // 处理发送错误（向后兼容现有错误处理）
        const errorInfo = getSendErrorMessage(result.error);
        setVerificationError(errorInfo.message);
      } else {
        setVerificationError('新的验证码已发送到您的邮箱');
        // 10秒后清除成功消息
        setTimeout(() => {
          setVerificationError('');
        }, 10000);
      }
    } catch (error) {
      // 🔧 增强重发验证码的网络错误处理
      console.error('Network error during resend:', error);
      
      // 根据错误类型提供具体的用户提示
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setVerificationError('网络连接异常，无法发送验证码，请检查网络后重试');
      } else if (error instanceof Error && error.message.includes('timeout')) {
        setVerificationError('发送请求超时，请重试或检查网络连接');
      } else {
        setVerificationError('发送验证码失败，请检查网络连接后重试');
      }
      
      // 即使出错也尝试刷新状态
      await refreshStatus();
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
              <Text fontSize="sm" whiteSpace="pre-line">
                {verificationError}
              </Text>
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
                isDisabled={isVerifying || isInFlight || errorCount >= 5}
                onChange={(value) => {
                  // 🔧 实时清理输入 - 只保留数字
                  const cleaned = value.replace(/\D/g, '');
                  setOtpValue(cleaned);
                }}
                onComplete={verifyOTP}
                otp
                size={'lg'}
                value={otpValue}
              >
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <PinInputField
                  borderColor={verificationError ? 'red.400' : 'gray.400'}
                  autoComplete="one-time-code"
                  inputMode="numeric"
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
              请输入收到的6位验证码（支持直接粘贴，会自动清理格式）
            </Text>

            <Button
              w="full"
              isDisabled={!canResend || resendCooldown > 0 || resendLoading}
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
              💡 小贴士：复制粘贴验证码时不用担心格式问题，系统会自动清理空格和其他字符。请检查您的邮箱（包括垃圾邮件文件夹）。
            </Text>
          </VStack>
        </VStack>
      </Flex>
    </>
  );
}
