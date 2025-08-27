import crypto from 'node:crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

import { kashEmail, replyToEmail, resend } from '@/features/emails';
import {
  generateSecureOTP,
  makeTimeCtx,
  OTP_CONFIG,
  OTP_ERROR_CODES,
  validateEmail,
} from '@/lib/auth/constants';
import logger, { maskSensitiveData } from '@/lib/logger';
import { prisma } from '@/prisma';

interface SendOtpResponse {
  success: boolean;
  sn?: number; // 服务器当前毫秒时间
  retry?: number; // 重试等待秒数，0表示可以发送
  exp?: number; // 最新token过期毫秒时间
  code?: string; // 错误码
  message?: string; // 可选的提示信息
}

// 生成验证码邮件HTML
function createOTPEmailHTML(token: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Solar Earn 登录验证码</h2>
      <p>您的验证码是：</p>
      <div style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        ${token}
      </div>
      <p>此验证码将在 <strong>10分钟</strong> 后过期。</p>
      <p>如果您没有请求此验证码，请忽略此邮件。</p>
    </div>
  `;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendOtpResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: OTP_ERROR_CODES.INTERNAL_ERROR,
    });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      code: OTP_ERROR_CODES.INVALID_EMAIL,
    });
  }

  // 邮箱格式验证
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      code: OTP_ERROR_CODES.INVALID_EMAIL,
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const timeCtx = makeTimeCtx(); // 统一时间基准

  // 生成调试ID
  const debugId = Math.random().toString(36).substring(2, 11);

  if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
    console.log(`🔍 [SEND-${debugId}] 验证码发送请求开始`, {
      timestamp: timeCtx.serverTime,
      email: normalizedEmail,
    });
  }

  try {
    // 一个事务内完成：屏蔽校验 → 限流 → 清理过期 → 控制活动token上限 → 插入新token
    const { newToken } = await prisma.$transaction(async (tx) => {
      // 1. 检查用户是否被屏蔽
      const user = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: { isBlocked: true },
      });

      if (user?.isBlocked) {
        throw new Error(OTP_ERROR_CODES.USER_BLOCKED);
      }

      // 2. 发送限流：直接使用 expires 阈值判断，避免时间反推
      // nowMs/nowDt 来自同一次 makeTimeCtx()
      const expiresThreshold = new Date(
        timeCtx.nowMs + OTP_CONFIG.TOKEN_EXPIRE_MS - OTP_CONFIG.RATE_LIMIT_MS,
      );

      // 存在 expires > 阈值 => 表示 60s 内发过
      const recent = await tx.verificationToken.findFirst({
        where: {
          identifier: normalizedEmail,
          expires: { gt: expiresThreshold },
        },
        select: { expires: true },
      });

      if (recent) {
        const remainingMs =
          recent.expires.getTime() - expiresThreshold.getTime();
        const retry = Math.max(1, Math.ceil(remainingMs / 1000));
        throw new Error(`${OTP_ERROR_CODES.RATE_LIMITED}:${retry}`);
      }

      // 4. 清理过期的验证码（🔧 修复：验证容错 = 清理保留原则）
      // 原则：凡是验证还会放行的token，清理阶段就不能删
      const cleanupExpiry = new Date(
        timeCtx.nowMs - OTP_CONFIG.VERIFICATION_TOLERANCE_MS,
      );
      await tx.verificationToken.deleteMany({
        where: {
          identifier: normalizedEmail,
          expires: { lt: cleanupExpiry }, // 只清理超出容错期的验证码
        },
      });

      // 5. 控制活动验证码上限（保留最新的几个，删除多余的）
      const activeTokens = await tx.verificationToken.findMany({
        where: {
          identifier: normalizedEmail,
          expires: { gte: timeCtx.nowDt },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeTokens.length >= OTP_CONFIG.MAX_ACTIVE_TOKENS_PER_EMAIL) {
        // 删除最旧的token，为新token腾出空间
        const tokensToDelete = activeTokens.slice(
          OTP_CONFIG.MAX_ACTIVE_TOKENS_PER_EMAIL - 1,
        );
        for (const token of tokensToDelete) {
          await tx.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: token.identifier,
                token: token.token,
              },
            },
          });
        }
      }

      // 6. 生成并插入新验证码
      const otpCode = generateSecureOTP();
      const expiresAt = new Date(timeCtx.nowMs + OTP_CONFIG.TOKEN_EXPIRE_MS);

      const newToken = await tx.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: otpCode,
          expires: expiresAt,
        },
      });

      if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
        console.log(`✅ [SEND-${debugId}] 事务完成，新验证码已创建`, {
          tokenHash: maskSensitiveData.code(newToken.token),
          expiresAt: newToken.expires.toISOString(),
        });
      }

      return { newToken };
    });

    // 事务外发送邮件 - 🔒 安全：失败时立即删除验证码，避免幽灵码
    const emailStartTime = Date.now();
    const tokenFingerprint = crypto
      .createHash('sha256')
      .update(newToken.token)
      .digest('hex')
      .substring(0, 8);

    try {
      const emailHtml = createOTPEmailHTML(newToken.token);

      await resend.emails.send({
        from: kashEmail,
        to: normalizedEmail,
        replyTo: replyToEmail,
        subject: OTP_CONFIG.EMAIL_SUBJECT,
        html: emailHtml,
      });

      const emailDuration = Date.now() - emailStartTime;

      if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
        console.log(`📧 [SEND-${debugId}] 邮件发送成功`, {
          email: normalizedEmail,
          tokenFingerprint, // 🔒 安全：只记录哈希指纹，不记录原文
          emailDuration,
          expiresAt: newToken.expires.toISOString(),
        });
      }

      logger.info('OTP sent successfully', {
        email: normalizedEmail,
        tokenFingerprint, // 🔒 安全：只记录哈希指纹
        emailDuration,
        expiresAt: newToken.expires.toISOString(),
        debugId,
      });

      return res.status(200).json({
        success: true,
        sn: timeCtx.nowMs,
        retry: Math.ceil(OTP_CONFIG.RATE_LIMIT_MS / 1000),
        exp: newToken.expires.getTime(),
      });
    } catch (emailError) {
      const emailDuration = Date.now() - emailStartTime;
      const errorCode =
        emailError instanceof Error ? emailError.message : 'unknown_error';

      // 🔒 CRITICAL 安全修复：邮件发送失败，立即删除验证码避免幽灵码
      try {
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizedEmail,
              token: newToken.token,
            },
          },
        });

        if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
          console.log(`🔒 [SEND-${debugId}] 邮件发送失败，验证码已安全删除`, {
            email: normalizedEmail,
            tokenFingerprint, // 🔒 安全：只记录哈希指纹
            emailDuration,
            errorCode,
            action: 'TOKEN_DELETED',
          });
        }

        logger.error('Email sending failed, token deleted', {
          email: normalizedEmail,
          tokenFingerprint, // 🔒 安全：只记录哈希指纹
          emailDuration,
          errorCode,
          debugId,
          action: 'TOKEN_DELETED',
        });
      } catch (deleteError) {
        // 🚨 删除失败是严重安全问题，需要立即告警
        const deleteErrorCode =
          deleteError instanceof Error
            ? deleteError.message
            : 'unknown_delete_error';

        if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
          console.error(
            `🚨 [SEND-${debugId}] CRITICAL: 验证码删除失败，存在泄露风险`,
            {
              email: normalizedEmail,
              tokenFingerprint, // 🔒 安全：只记录哈希指纹
              emailDuration,
              emailError: errorCode,
              deleteError: deleteErrorCode,
              action: 'TOKEN_DELETE_FAILED',
              severity: 'CRITICAL',
            },
          );
        }

        logger.error('CRITICAL: Token deletion failed after email failure', {
          email: normalizedEmail,
          tokenFingerprint, // 🔒 安全：只记录哈希指纹
          emailDuration,
          emailError: errorCode,
          deleteError: deleteErrorCode,
          debugId,
          action: 'TOKEN_DELETE_FAILED',
          severity: 'CRITICAL',
        });
      }

      return res.status(500).json({
        success: false,
        code: OTP_ERROR_CODES.EMAIL_SEND_FAILED,
        sn: timeCtx.nowMs,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 解析限流错误
    if (errorMessage.startsWith(OTP_ERROR_CODES.RATE_LIMITED)) {
      const [, remainingStr] = errorMessage.split(':');
      const remainingSeconds = remainingStr ? parseInt(remainingStr, 10) : 0;

      return res.status(429).json({
        success: false,
        code: OTP_ERROR_CODES.RATE_LIMITED,
        retry: remainingSeconds,
        sn: timeCtx.nowMs,
      });
    }

    // 处理其他已知错误
    if (Object.values(OTP_ERROR_CODES).includes(errorMessage as any)) {
      return res.status(400).json({
        success: false,
        code: errorMessage,
        sn: timeCtx.nowMs,
      });
    }

    if (OTP_CONFIG.DEBUG_LOG_ENABLED) {
      console.log(`💥 [SEND-${debugId}] 未知错误`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    logger.error('OTP sending failed', {
      email: normalizedEmail,
      error: errorMessage,
      debugId,
    });

    return res.status(500).json({
      success: false,
      code: OTP_ERROR_CODES.INTERNAL_ERROR,
      sn: timeCtx.nowMs,
    });
  }
}
