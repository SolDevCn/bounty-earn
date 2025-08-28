// OTP 验证码配置常量
export const OTP_CONFIG = {
  // 时间配置（毫秒）
  TOKEN_EXPIRE_MS: 10 * 60 * 1000,        // 10分钟有效期
  RATE_LIMIT_MS: 60 * 1000,               // 60秒发送限制
  RESEND_TOLERANCE_MS: 30 * 1000,         // 重发容差30秒
  VERIFICATION_TOLERANCE_MS: 5 * 1000,    // 验证容错5秒
  
  // 限制配置
  MAX_ACTIVE_TOKENS_PER_EMAIL: 3,         // 每邮箱最多3个活动验证码
  
  // 邮件配置
  EMAIL_SUBJECT: 'Solar Earn 登录验证码',
  
  // 调试配置
  DEBUG_LOG_ENABLED: process.env.NODE_ENV === 'development',
} as const;

// OTP 错误码
export const OTP_ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  RATE_LIMITED: 'RATE_LIMITED', 
  USER_BLOCKED: 'USER_BLOCKED',
  EXPIRED_CODE: 'EXPIRED_CODE',
  INVALID_CODE: 'INVALID_CODE',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// 错误码到中文提示的映射
export const ERROR_MESSAGES = {
  [OTP_ERROR_CODES.INVALID_EMAIL]: '邮箱格式不正确',
  [OTP_ERROR_CODES.RATE_LIMITED]: '请求过于频繁，请稍后重试',
  [OTP_ERROR_CODES.USER_BLOCKED]: '账户已被屏蔽，请联系客服',
  [OTP_ERROR_CODES.EXPIRED_CODE]: '验证码已过期，请重新获取',
  [OTP_ERROR_CODES.INVALID_CODE]: '验证码不正确，请检查输入',
  [OTP_ERROR_CODES.VERIFICATION_FAILED]: '验证失败，请重试',
  [OTP_ERROR_CODES.EMAIL_SEND_FAILED]: '邮件发送失败，请重试',
  [OTP_ERROR_CODES.INTERNAL_ERROR]: '系统错误，请稍后重试',
} as const;

// 时间上下文创建函数
export function makeTimeCtx() {
  const nowMs = Date.now();
  const nowDt = new Date(nowMs);
  return {
    nowMs,
    nowDt,
    serverTime: nowDt.toISOString(),
  };
}

import crypto from 'node:crypto';

// 生成安全的6位数字验证码
export function generateSecureOTP(): string {
  // 使用加密随机数生成6位数字
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

// 验证邮箱格式
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}