import { Button, FormControl, Input, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { usePostHog } from 'posthog-js/react';
import React, { useState } from 'react';

import { validateEmailRegex } from '../utils/email';

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
        // � 直接发送验证码，所有限流/并发控制在 EmailProvider 中处理
        posthog.capture('email OTP_auth');
        localStorage.setItem('emailForSignIn', email);

        const result = await signIn('email', {
          email,
          redirect: false,
        });

        if (result?.error) {
          setIsLoading(false);

          // 处理 EmailProvider 返回的错误
          if (result.error === 'BLOCKED_EMAIL') {
            setEmailError('该邮箱地址已被屏蔽，无法发送验证码。');
          } else if (result.error.startsWith('RATE_LIMITED:')) {
            const remaining = result.error.split(':')[1] || '60';
            setEmailError(`发送过于频繁，请等待 ${remaining} 秒后重试。`);
          } else if (result.error === 'TOO_MANY_TOKENS') {
            setEmailError('该邮箱有过多未使用的验证码，请稍后再试。');
          } else if (result.error === 'EMAIL_SEND_FAILED') {
            setEmailError('邮件发送失败，请稍后重试。');
          } else {
            setEmailError('无法发送验证码，请稍后重试。');
          }
          return;
        }

        // 发送成功，跳转到验证页面
        router.push('/verify-request');
      } catch (error) {
        setIsLoading(false);
        console.error('Error during email validation:', error);
        setEmailError('验证您的电子邮件时发生错误。请稍后重试或联系我们。');
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
