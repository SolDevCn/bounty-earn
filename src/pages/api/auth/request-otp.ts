import type { NextApiRequest, NextApiResponse } from 'next';

import logger from '@/lib/logger';
import { prisma } from '@/prisma';

// 验证码时间配置常量
const RATE_LIMIT_MS = 60 * 1000; // 60秒发送限制

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 检查邮箱是否被屏蔽
    const isBlocked = await prisma.blockedEmail.findUnique({
      where: { email: normalizedEmail },
    });

    if (isBlocked) {
      logger.debug('OTP request blocked for email:', normalizedEmail);
      return res.status(403).json({ error: 'BLOCKED_EMAIL' });
    }

    // 统一时间基准 - 全链路复用
    const serverNow = Date.now();
    const nowDt = new Date(serverNow);

    // 检查发送频率限制 - 只看最近一次创建时间（不筛过期）
    const lastToken = await prisma.verificationToken.findFirst({
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

    if (lastToken) {
      const timeSinceCreated = serverNow - lastToken.createdAt.getTime();

      // 60秒冷却期检查
      if (timeSinceCreated < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil(
          (RATE_LIMIT_MS - timeSinceCreated) / 1000,
        );
        logger.debug('OTP rate limited for email:', normalizedEmail, {
          remainingSeconds,
        });
        return res.status(429).json({
          error: 'RATE_LIMITED',
          remainingSeconds,
        });
      }
    }

    // 检查未过期验证码数量
    const tokenCount = await prisma.verificationToken.count({
      where: {
        identifier: normalizedEmail,
        expires: {
          gt: nowDt,
        },
      },
    });

    if (tokenCount >= 3) {
      logger.debug('Too many active tokens for email:', normalizedEmail);
      return res.status(429).json({
        error: 'TOO_MANY_TOKENS',
        message: '该邮箱有过多未使用的验证码，请稍后再试',
      });
    }

    // 检查通过，可以发送验证码
    return res.status(200).json({ canSend: true });
  } catch (error) {
    logger.error('Error checking OTP eligibility:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}