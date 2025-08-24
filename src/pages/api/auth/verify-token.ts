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

  if (!token || !email) {
    return res.status(400).json({
      success: false,
      error: 'Token and email are required',
    });
  }

  try {
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

    // 验证码正确，返回成功
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Verification token check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}