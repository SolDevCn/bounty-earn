import { Button, FormControl, Input, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { usePostHog } from 'posthog-js/react';
import React, { useState } from 'react';

import { validateEmailRegex } from '../utils/email';
import { ERROR_MESSAGES, OTP_ERROR_CODES } from '@/lib/auth/constants';

export const EmailSignIn = () => {
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const router = useRouter();
  const posthog = usePostHog();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailInput = e.target.value.trim();
    setEmail(emailInput);
    setIsEmailValid(validateEmailRegex(emailInput));
    setEmailError('');
  };

  const handleEmailSignIn = async () => {
    setIsLoading(true);
    setHasAttemptedSubmit(true);
    setEmailError('');

    if (isEmailValid) {
      try {
        // const isValidEmail = await checkEmailValidity(email);
        const isValidEmail = true;
        if (isValidEmail) {
          posthog.capture('email OTP_auth');
          localStorage.setItem('emailForSignIn', email);
          
          // 发送验证码
          const response = await fetch('/api/auth/send-otp/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const result = await response.json();
          
          if (result.success) {
            // 成功发送验证码，跳转到验证页面
            router.push(`/verify-request?email=${encodeURIComponent(email)}`);
          } else {
            // 处理发送失败
            setIsLoading(false);
            // 使用统一的错误处理
            const errorMessage = result.code === OTP_ERROR_CODES.RATE_LIMITED && result.retry
              ? `请求过于频繁，请 ${result.retry} 秒后重试`
              : (ERROR_MESSAGES[result.code as keyof typeof ERROR_MESSAGES] || '发送验证码失败，请重试');
            setEmailError(errorMessage);
          }
        } else {
          setIsLoading(false);
          setEmailError(
            '该电子邮件地址似乎是无效的或需要白名单。请检查并重试。',
          );
        }
      } catch (error) {
        setIsLoading(false);
        console.error('Error during email validation:', error);
        
        // 识别具体的错误类型
        let errorMessage = '验证您的电子邮件时发生错误。请稍后重试或联系我们。';
        
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          errorMessage = '网络连接失败，请检查您的网络连接或尝试关闭VPN后重试。';
        } else if (error instanceof Error) {
          if (error.message.includes('ENOTFOUND') || error.message.includes('ENETUNREACH')) {
            errorMessage = '无法连接到服务器，请检查网络连接是否正常。';
          } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            errorMessage = '请求超时，可能是网络较慢或VPN连接不稳定，请重试。';
          } else if (error.message.includes('ECONNRESET') || error.message.includes('EPIPE')) {
            errorMessage = '连接被重置，可能是网络不稳定或防火墙阻止，请检查网络设置。';
          } else if (error.message.includes('blocked') || error.message.includes('restricted')) {
            errorMessage = '请求被阻止，请尝试关闭VPN或更换网络环境。';
          }
        }
        
        setEmailError(errorMessage);
      }
    } else {
      setIsLoading(false);
      setEmailError('请输入有效的电子邮件地址。');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEmailSignIn();
    }
  };

  const isError = hasAttemptedSubmit && !isEmailValid;

  return (
    <>
      <FormControl isInvalid={isError}>
        <Input
          fontSize={'16px'}
          borderColor="#CBD5E1"
          _placeholder={{ fontSize: '16px' }}
          onChange={handleEmailChange}
          onKeyDown={handleKeyDown}
          placeholder="输入您的电子邮件地址"
          size="lg"
          value={email}
        />
      </FormControl>
      <Button
        className="ph-no-capture"
        w="100%"
        h="2.9rem"
        mt={3}
        fontSize="17px"
        fontWeight={500}
        isDisabled={isLoading}
        isLoading={isLoading}
        onClick={handleEmailSignIn}
        size="lg"
      >
        邮箱登录
      </Button>
      {emailError && (
        <Text
          align={'center'}
          mt={2}
          color="red.500"
          fontSize={'xs'}
          lineHeight={'0.9rem'}
        >
          {emailError}
        </Text>
      )}
    </>
  );
};
