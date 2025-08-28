import { ERROR_MESSAGES, OTP_ERROR_CODES } from './constants';

// 获取错误码对应的中文提示信息
export function getErrorMessage(errorCode: string): string {
  return (
    ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] ||
    '未知错误，请重试'
  );
}

// 处理 send-otp API 的响应
export function handleSendOtpResponse(result: any): {
  success: boolean;
  message: string;
  remainingSeconds?: number;
} {
  if (result.success) {
    return {
      success: true,
      message: '验证码已发送到您的邮箱',
    };
  }

  // 处理限流错误，返回等待时间
  if (result.code === OTP_ERROR_CODES.RATE_LIMITED && result.retry) {
    return {
      success: false,
      message: `请求过于频繁，请 ${result.retry} 秒后重试`,
      remainingSeconds: result.retry,
    };
  }

  // 处理其他错误码
  const message = getErrorMessage(
    result.code || OTP_ERROR_CODES.INTERNAL_ERROR,
  );
  return {
    success: false,
    message,
  };
}

// 处理验证失败的错误信息映射（保持与现有代码兼容）
export function getSendErrorMessage(error: string): { message: string } {
  // 向后兼容现有的错误处理逻辑
  switch (error) {
    case 'AccessDenied':
      return { message: '访问被拒绝，请检查您的邮箱或联系客服' };
    case 'EmailCreateError':
      return { message: '邮件发送失败，请稍后重试' };
    case 'Verification':
      return { message: '验证失败，请重试' };
    default:
      return { message: '发送验证码时出现错误，请重试' };
  }
}

// 处理验证码验证错误
export function getVerificationErrorMessage(error: string): string {
  switch (error) {
    case 'invalid_credentials':
    case 'invalid_code':
      return '验证码不正确，请检查输入的6位数字是否与邮件中的验证码一致';
    case 'expired_code':
      return '验证码已过期，请重新获取验证码';
    case 'user_blocked':
      return '账户已被屏蔽，请联系客服';
    case 'verification_failed':
      return '验证失败，请重试或重新获取验证码';
    default:
      return '验证过程中出现错误，请重试';
  }
}
