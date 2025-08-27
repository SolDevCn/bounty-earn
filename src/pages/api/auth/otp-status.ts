import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/prisma';

// 验证码时间配置常量 - 与nextauth.ts保持一致
const RATE_LIMIT_MS = 60 * 1000;          // 60秒发送限制
const RESEND_TOLERANCE_MS = 30 * 1000;    // 重发容差30秒（仅重发时宽松）
const VERIFICATION_TOLERANCE_MS = 5 * 1000; // 验证容错5秒，减少时间同步问题

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

// 核心时间判断函数 - 与nextauth.ts完全一致（验证严格0容差，重发宽松容差）
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
  const strictExpireTime = token.expires.getTime();                        // 🔑 验证严格0容差
  const resendAllowTime = token.expires.getTime() + RESEND_TOLERANCE_MS;    // 🔑 重发宽松30s容差
  
  // 优先级1: 发送频率限制（最高优先级）
  if (serverNow < rateLimitEndTime) {
    const remainingSeconds = Math.ceil((rateLimitEndTime - serverNow) / 1000);
    return {
      canSend: false,
      canVerify: serverNow <= strictExpireTime + VERIFICATION_TOLERANCE_MS, // 🔑 验证使用容错时间，与实际验证逻辑一致
      message: `请求过于频繁，请 ${remainingSeconds} 秒后重试`,
      remainingSeconds,
    };
  }
  
  // 优先级2: 验证码过期（验证使用容错期，重发宽松容差）
  if (serverNow > strictExpireTime + VERIFICATION_TOLERANCE_MS) {  // 🔑 使用容错期判断过期，与验证逻辑一致使用 >
    const canResend = serverNow >= resendAllowTime;  // 🔑 使用 >= 确保恰好30秒时可重发
    return {
      canSend: canResend,
      canVerify: false, // 🔑 超出容错期后不可验证
      message: canResend ? '验证码已过期，可重新获取' : '验证码已过期，请稍等再重新获取',
    };
  }
  
  // 优先级3: 正常有效状态
  return {
    canSend: true,  // 有效期内也允许重发（用户体验考虑）
    canVerify: true,
    message: '验证码有效',
  };
}

// 计算验证码过期剩余时间（包含容错期，用于用户展示）
function calculateTokenExpireSeconds(
  token: { expires: Date } | null,
  serverNow: number
): number {
  if (!token) return 0;

  // 🔑 使用容错时间计算剩余时间 - 与实际验证逻辑一致
  const tolerantExpireTime = token.expires.getTime() + VERIFICATION_TOLERANCE_MS;
  const remaining = tolerantExpireTime - serverNow;

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

    // 🔐 查找最新的未过期验证码用于状态判断
    const latestToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: {
          gt: new Date(serverNow - 24 * 60 * 60 * 1000), // 查找24小时内的验证码用于状态分析
        },
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