import type { NextApiRequest, NextApiResponse } from 'next';

import { OTP_CONFIG, makeTimeCtx, validateEmail } from '@/lib/auth/constants';
import { prisma } from '@/prisma';

interface OtpStatusResponse {
  success: boolean;
  data?: {
    sn: number;        // 服务器当前毫秒时间
    retry: number;     // 重试等待秒数，0表示可以发送
    exp: number | null; // 最新token过期毫秒时间，null表示没有
  };
  error?: string;
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

  if (!email || typeof email !== 'string' || !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email parameter',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const timeCtx = makeTimeCtx(); // 统一时间基准

  try {
    // 直接使用 expires 阈值判断，避免时间反推
    // nowMs/nowDt 来自同一次 makeTimeCtx()
    const expiresThreshold = new Date(timeCtx.nowMs + OTP_CONFIG.TOKEN_EXPIRE_MS - OTP_CONFIG.RATE_LIMIT_MS);

    // 存在 expires > 阈值 => 表示 60s 内发过
    const recent = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: { gt: expiresThreshold }
      },
      select: { expires: true },
    });

    let retry = 0; // 默认可以发送
    let exp = null; // 默认没有有效token

    if (recent) {
      const remainingMs = recent.expires.getTime() - expiresThreshold.getTime();
      retry = Math.max(1, Math.ceil(remainingMs / 1000));
    }

    // 查找最新的有效验证码（用于返回过期时间）
    const latest = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: { gt: new Date(timeCtx.nowMs) } // 只查找未过期的
      },
      orderBy: { expires: 'desc' },
      select: { expires: true },
    });

    if (latest) {
      exp = latest.expires.getTime();
    }

    // 按照三字段格式返回
    return res.status(200).json({
      success: true,
      data: {
        sn: timeCtx.nowMs,
        retry,
        exp,
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