import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/prisma';

// 验证码时间配置常量 - 与nextauth.ts保持一致
const RATE_LIMIT_MS = 60 * 1000;          // 60秒发送限制
const EXPIRE_TOLERANCE_MS = 30 * 1000;     // 验证容差30秒（仅验码时宽松）

interface TimeStatus {
  canSend: boolean;
  canVerify: boolean;
  message: string;
  remainingSeconds?: number;
}

interface OtpStatusResponse {
  success: boolean;
  data?: {
    canSend: boolean;
    canVerify: boolean;
    resendCooldownSeconds: number;
    tokenExpireSeconds: number;
    serverTimestamp: number;
    message: string;
  };
  error?: string;
}

// 核心时间判断函数 - 与nextauth.ts完全一致
function checkVerificationTokenStatus(
  token: { createdAt: Date; expires: Date } | null,
  serverNow: number
): TimeStatus {
  // 情况1: 没有token，可以发送
  if (!token) {
    return {
      canSend: true,
      canVerify: false,
      message: '可以发送验证码',
    };
  }
  
  const rateLimitEndTime = token.createdAt.getTime() + RATE_LIMIT_MS;
  const expireTimeWithTolerance = token.expires.getTime() + EXPIRE_TOLERANCE_MS;
  
  // 情况2: 发送冷却中（严格判断，0容差，优先级最高）
  if (serverNow < rateLimitEndTime) {
    const remainingSeconds = Math.ceil((rateLimitEndTime - serverNow) / 1000);
    return {
      canSend: false,
      canVerify: serverNow <= expireTimeWithTolerance, // 可能还能验证
      message: `请求过于频繁，请 ${remainingSeconds} 秒后重试`,
      remainingSeconds,
    };
  }
  
  // 情况3: 验证码过期（宽松判断，+30s容差）
  if (serverNow > expireTimeWithTolerance) {
    return {
      canSend: true,  // 过期了可以重新发送
      canVerify: false,
      message: '验证码已过期，请重新获取',
    };
  }
  
  // 情况4: 正常状态
  return {
    canSend: true,
    canVerify: true,
    message: '验证码有效',
  };
}

// 计算验证码过期剩余时间（宽松边界）
function calculateTokenExpireSeconds(
  token: { expires: Date } | null,
  serverNow: number
): number {
  if (!token) return 0;
  
  // 使用宽松时间（+30s容差）计算剩余时间
  const expireTimeWithTolerance = token.expires.getTime() + EXPIRE_TOLERANCE_MS;
  const remaining = expireTimeWithTolerance - serverNow;
  
  return Math.max(0, Math.ceil(remaining / 1000));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OtpStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Email parameter is required',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const serverNow = Date.now(); // 统一时间基准

    // 查找最新的验证码
    const latestToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 使用核心逻辑函数进行统一判断
    const timeStatus = checkVerificationTokenStatus(latestToken, serverNow);

    // 计算具体的剩余时间
    const resendCooldownSeconds = timeStatus.remainingSeconds || 0;
    const tokenExpireSeconds = calculateTokenExpireSeconds(latestToken, serverNow);

    return res.status(200).json({
      success: true,
      data: {
        canSend: timeStatus.canSend,
        canVerify: timeStatus.canVerify,
        resendCooldownSeconds,
        tokenExpireSeconds,
        serverTimestamp: serverNow,
        message: timeStatus.message,
      },
    });
  } catch (error) {
    console.error('OTP status query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}