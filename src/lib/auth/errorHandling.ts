import { OTP_ERROR_CODES, type OtpErrorCode } from './constants';

/**
 * 验证码错误处理工具
 */

// 验证错误码到用户友好消息的映射
export const getOtpErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case OTP_ERROR_CODES.INVALID_CODE:
      return '验证码不正确，请重新输入';
    case OTP_ERROR_CODES.INVALID_OR_EXPIRED_CODE:
      return '验证码无效或已过期，请重新获取';
    case OTP_ERROR_CODES.EXPIRED_CODE:
      return '验证码已过期，请重新获取';
    case OTP_ERROR_CODES.CODE_ALREADY_USED:
      return '验证码已被使用，请重新获取';
    case OTP_ERROR_CODES.USER_BLOCKED:
      return '该邮箱已被屏蔽，请联系管理员';
    case OTP_ERROR_CODES.VERIFICATION_FAILED:
      return '验证失败，请稍后重试';
    case OTP_ERROR_CODES.INVALID_CREDENTIALS:
      return '请输入正确的邮箱和验证码';
    case OTP_ERROR_CODES.BLOCKED_EMAIL:
      return '该邮箱暂不可用，请更换邮箱或联系管理员';
    case OTP_ERROR_CODES.EMAIL_SEND_FAILED:
      return '邮件发送失败，请稍后重试';
    case OTP_ERROR_CODES.VERIFICATION_BLOCKED:
      return '验证尝试次数过多，账户已被暂时锁定';
    case OTP_ERROR_CODES.TOO_MANY_ATTEMPTS:
      return '验证失败次数过多，已被锁定';
    // NextAuth 特殊错误码
    case 'CredentialsSignin':
      return '验证码不正确，请重新输入';
    case 'Signin':
      return '验证码验证失败，请重新输入';
    case 'EmailSignin':
      return '邮件发送失败，请稍后重试';
    default:
      // 🔒 处理验证被阻断错误
      if (errorCode.startsWith('verification_blocked')) {
        const match = errorCode.match(/verification_blocked:(\d+)/);
        if (match && match[1]) {
          const remainingSeconds = parseInt(match[1], 10);
          const minutes = Math.ceil(remainingSeconds / 60);
          return `验证尝试次数过多，请 ${minutes} 分钟后重试`;
        }
        return '验证尝试次数过多，账户已被暂时锁定';
      }
      
      // 🔒 处理验证失败过多错误
      if (errorCode.startsWith('too_many_attempts')) {
        const match = errorCode.match(/too_many_attempts:(\d+)/);
        if (match && match[1]) {
          const minutes = parseInt(match[1], 10);
          return `验证失败次数过多，账户已被锁定 ${minutes} 分钟`;
        }
        return '验证失败次数过多，账户已被暂时锁定';
      }
      
      return '验证码不正确，请重新输入';
  }
};

// 发送错误处理
export const getSendErrorMessage = (
  errorCode: string,
): { message: string; remaining?: number } => {
  // 处理频率限制错误
  if (errorCode.startsWith('RATE_LIMITED')) {
    const match = errorCode.match(/RATE_LIMITED:(\d+)/);
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
  }

  switch (errorCode) {
    case OTP_ERROR_CODES.BLOCKED_EMAIL:
      return { message: '该邮箱暂不可用，请更换邮箱或联系管理员' };
    case OTP_ERROR_CODES.TOO_MANY_TOKENS:
      return { message: '该邮箱有过多未使用的验证码，请稍后再试' };
    case OTP_ERROR_CODES.RATE_LIMITED:
      return { message: '发送过于频繁，请稍后再试' };
    case 'EmailSignin':
      return { message: '邮件发送失败，请稍后重试' };
    default:
      return { message: '发送验证码失败，请稍后重试' };
  }
};

// 网络错误处理
export const getNetworkErrorMessage = (error: unknown): string => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return '网络连接异常，请检查网络后重试';
  } else if (error instanceof Error && error.message.includes('timeout')) {
    return '请求超时，请重试或检查网络连接';
  } else if (error instanceof Error && error.message.includes('abort')) {
    return '请求被中断，请重试';
  } else {
    return '网络异常，请重试或刷新页面';
  }
};