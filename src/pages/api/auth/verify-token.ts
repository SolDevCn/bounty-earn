import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/prisma';

interface VerifyTokenRequest {
  token: string;
  email: string;
}

interface VerifyTokenResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyTokenResponse>,
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  const { token, email }: VerifyTokenRequest = req.body;

  // 基本输入验证
  if (!token || !email || !/^\d{6}$/.test(token)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid token or email format',
    });
  }

  try {
    // 简单的速率限制 - 检查最近尝试次数
    const recentAttempts = await prisma.verificationToken.count({
      where: {
        identifier: email,
        // 检查最近15分钟内的尝试次数（通过expires字段估算）
        expires: {
          gte: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
    });

    // 如果同一邮箱有超过3个未过期的验证码，说明请求过频
    if (recentAttempts > 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many verification attempts. Please wait before trying again.',
      });
    }

    // 查找有效的验证码记录
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token,
        expires: {
          gt: new Date(), // 未过期
        },
      },
    });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code',
      });
    }

    // 验证成功后立即删除验证码，防止重复使用
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Verification token check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}