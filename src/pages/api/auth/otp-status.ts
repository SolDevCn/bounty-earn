import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/prisma';

// 验证码时间配置常量 - 与nextauth.ts保持一致
const RATE_LIMIT_MS = 60 * 1000; // 60秒发送限制
const RESEND_TOLERANCE_MS = 30 * 1000; // 重发容差30秒（仅重发时宽松）

interface TimeStatus {
  retryCooldownSeconds: number;
}

interface OtpStatusResponse {
  success: boolean;
  data?: {
    sn: number; // server now ms
    retry: number; // retry cooldown seconds
    exp: number | null; // latest token expiration ms, null if no token
  };
  error?: string;
}

// 核心时间判断函数 - 计算重发冷却时间
function checkVerificationTokenStatus(
  latestToken: { createdAt: Date } | null,
  activeToken: { expires: Date } | null,
  serverNow: number
): TimeStatus {
  // 优先级1: 发送频率限制（最高优先级）- 基于最近创建时间
  if (latestToken) {
    const rateLimitEndTime = latestToken.createdAt.getTime() + RATE_LIMIT_MS;
    if (serverNow < rateLimitEndTime) {
      const remainingSeconds = Math.ceil((rateLimitEndTime - serverNow) / 1000);
      return {
        retryCooldownSeconds: remainingSeconds,
      };
    }
  }
  
  // 优先级2: 重发容差期判断 - 基于活跃token的过期时间
  if (activeToken) {
    // 有活跃token，可以重发
    return {
      retryCooldownSeconds: 0,
    };
  }
  
  // 优先级3: 容差期判断（如果有最近token但已过期）
  if (latestToken) {
    // 需要计算最近token的过期时间（假设10分钟有效期）
    const TOKEN_EXPIRE_MS = 10 * 60 * 1000;
    const estimatedExpireTime = latestToken.createdAt.getTime() + TOKEN_EXPIRE_MS;
    const resendAllowTime = estimatedExpireTime + RESEND_TOLERANCE_MS;
    
    if (serverNow >= estimatedExpireTime) {
      const cooldownRemaining = Math.max(0, resendAllowTime - serverNow);
      return {
        retryCooldownSeconds: Math.ceil(cooldownRemaining / 1000),
      };
    }
  }
  
  // 情况4: 没有任何token，可以发送
  return {
    retryCooldownSeconds: 0,
  };
}

// 计算验证码过期时间戳（严格边界）
function calculateTokenExpireTimestamp(
  token: { expires: Date } | null,
): number | null {
  if (!token) return null;

  // 返回过期时间戳（毫秒）
  return token.expires.getTime();
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
    // 统一时间基准 - 全链路复用
    const serverNow = Date.now();
    const nowDt = new Date(serverNow);

    // 分离查询：冷却检查（不筛过期）+ 过期检查（只看未过期）
    
    // 1. 冷却检查 - 看最近一次创建时间（不筛过期）
    const latestAnyToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. 过期检查 - 看所有未过期中最晚过期的
    const activeToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: {
          gt: nowDt,
        },
      },
      select: {
        expires: true,
      },
      orderBy: {
        expires: 'desc',
      },
    });

    // 使用分离的数据进行统一判断
    const timeStatus = checkVerificationTokenStatus(latestAnyToken, activeToken, serverNow);

    // 计算验证码过期时间戳
    const expireTimestamp = calculateTokenExpireTimestamp(activeToken);

    // 设置缓存控制头
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      data: {
        sn: serverNow, // server now ms
        retry: timeStatus.retryCooldownSeconds, // retry cooldown seconds
        exp: expireTimestamp, // expiration timestamp ms
      },
    });
  } catch (error) {
    console.error('OTP status query error:', error);
    
    // 保守兜底：返回安全的默认值，不阻塞前端操作
    const fallbackNow = Date.now();
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      data: {
        sn: fallbackNow,
        retry: 0, // 允许尝试发送
        exp: null, // 无验证码状态
      },
    });
  }
}