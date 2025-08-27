import type { NextApiRequest, NextApiResponse } from 'next';

import {
  makeTimeCtx,
  RATE_LIMIT_MS,
  RESEND_TOLERANCE_MS,
  TOKEN_EXPIRE_MS,
} from '@/lib/auth/constants';
import { prisma } from '@/prisma';

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
  latestToken: { createdAt: Date; expires: Date } | null,
  activeToken: { expires: Date } | null,
  serverNow: number,
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
    // 使用统一的验证码有效期常量
    const estimatedExpireTime =
      latestToken.createdAt.getTime() + TOKEN_EXPIRE_MS;
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
  res: NextApiResponse<OtpStatusResponse>,
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
    // 🚀 使用统一时间上下文，确保时间一致性
    const { nowMs: serverNow } = makeTimeCtx();

    // 🚀 优化：单次查询获取所有需要的验证码信息
    const tokens = await prisma.verificationToken.findMany({
      where: {
        identifier: normalizedEmail,
      },
      select: {
        createdAt: true,
        expires: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // 只取最近的5个，足够判断状态
    });

    // 🚀 从查询结果中提取需要的信息，确保类型安全
    const latestAnyToken: { createdAt: Date; expires: Date } | null =
      tokens.length > 0 ? tokens[0]! : null;
    const activeTokens = tokens
      .filter((token) => token.expires.getTime() > serverNow)
      .sort((a, b) => b.expires.getTime() - a.expires.getTime());
    const activeToken: { expires: Date } | null = activeTokens[0] ?? null;

    // 使用分离的数据进行统一判断
    const timeStatus = checkVerificationTokenStatus(
      latestAnyToken,
      activeToken,
      serverNow,
    );

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
