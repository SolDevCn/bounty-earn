import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';

import {
  kashEmail,
  OTPTemplate,
  replyToEmail,
  resend,
} from '@/features/emails';
import {
  makeTimeCtx,
  MAX_ACTIVE_TOKENS_PER_EMAIL,
  MAX_VERIFICATION_ATTEMPTS,
  OTP_ERROR_CODES,
  RATE_LIMIT_MS,
  timeUtils,
  TOKEN_EXPIRE_SEC,
} from '@/lib/auth/constants';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

export const authOptions: NextAuthOptions = {
  // 🔧 修复：恢复PrismaAdapter以支持EmailProvider的VerificationToken存储
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // OTP验证provider - 用于验证6位数字验证码
    CredentialsProvider({
      id: 'otp',
      name: 'OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          throw new Error('invalid_credentials');
        }

        const { email, code } = credentials;

        // 邮箱统一小写处理
        const normalizedEmail = email.toLowerCase().trim();

        // 基本输入验证
        if (!/^\d{6}$/.test(code)) {
          throw new Error('invalid_code');
        }

        try {
          // 🚀 使用统一时间上下文，确保验证流程时间一致性
          const { nowMs: serverNow, nowDt } = makeTimeCtx();

          // 🚀 使用事务确保原子预占用的安全性
          return await prisma.$transaction(async (tx) => {
            // 🔒 检查验证尝试锁定状态
            const verificationAttempt = await tx.verificationAttempt.findUnique(
              {
                where: { email: normalizedEmail },
              },
            );

            // 如果被锁定，直接拒绝验证
            if (
              verificationAttempt?.blockedUntil &&
              timeUtils.isVerificationBlocked(
                verificationAttempt.blockedUntil,
                serverNow,
              )
            ) {
              const remainingSeconds = timeUtils.getVerificationBlockRemaining(
                verificationAttempt.blockedUntil,
                serverNow,
              );
              logger.debug('Verification blocked due to too many attempts', {
                email: normalizedEmail,
                attempts: verificationAttempt.attempts,
                remainingSeconds,
              });
              throw new Error(
                `${OTP_ERROR_CODES.VERIFICATION_BLOCKED}:${remainingSeconds}`,
              );
            }
            // 🔑 查找有效的验证码（严格验证：expires > now）
            const validToken = await tx.verificationToken.findUnique({
              where: {
                identifier_token: {
                  identifier: normalizedEmail,
                  token: code,
                },
              },
            });

            // 验证码不存在或已过期
            if (!validToken || validToken.expires <= nowDt) {
              // 🔒 记录验证失败，递增尝试次数
              const currentAttempts = (verificationAttempt?.attempts || 0) + 1;
              const shouldBlock = currentAttempts >= MAX_VERIFICATION_ATTEMPTS;

              await tx.verificationAttempt.upsert({
                where: { email: normalizedEmail },
                create: {
                  email: normalizedEmail,
                  attempts: currentAttempts,
                  lastAttempt: nowDt,
                  blockedUntil: shouldBlock
                    ? timeUtils.getNewBlockedUntilTime(serverNow)
                    : null,
                },
                update: {
                  attempts: currentAttempts,
                  lastAttempt: nowDt,
                  blockedUntil: shouldBlock
                    ? timeUtils.getNewBlockedUntilTime(serverNow)
                    : undefined,
                },
              });

              // 🔒 关键修复：验证失败后删除验证码，防止重复尝试
              if (validToken) {
                await tx.verificationToken.delete({
                  where: {
                    identifier_token: {
                      identifier: normalizedEmail,
                      token: code,
                    },
                  },
                });
              }

              logger.debug('Verification failed: invalid or expired code', {
                email: normalizedEmail,
                codeExists: !!validToken,
                isExpired: validToken ? validToken.expires <= nowDt : null,
                attempts: currentAttempts,
                isBlocked: shouldBlock,
                tokenDeleted: !!validToken,
                serverNow: new Date(serverNow),
              });

              // 根据是否被锁定返回不同错误
              if (shouldBlock) {
                const blockDurationMinutes = Math.ceil(
                  timeUtils.getVerificationBlockRemaining(
                    timeUtils.getNewBlockedUntilTime(serverNow),
                    serverNow,
                  ) / 60,
                );
                throw new Error(
                  `${OTP_ERROR_CODES.TOO_MANY_ATTEMPTS}:${blockDurationMinutes}`,
                );
              }

              throw new Error(OTP_ERROR_CODES.INVALID_OR_EXPIRED_CODE);
            }

            // 查找或创建用户
            let user = await tx.user.findUnique({
              where: { email: normalizedEmail },
            });

            if (!user) {
              user = await tx.user.create({
                data: {
                  email: normalizedEmail,
                  username: normalizedEmail.split('@')[0], // 默认使用邮箱前缀作为用户名
                },
              });
            }

            // 检查用户是否被屏蔽
            if (user.isBlocked) {
              throw new Error(OTP_ERROR_CODES.USER_BLOCKED);
            }

            // 🔧 安全修复：验证成功后立即删除验证码，防止重复使用
            await tx.verificationToken.delete({
              where: {
                identifier_token: {
                  identifier: normalizedEmail,
                  token: code,
                },
              },
            });

            // 🔒 验证成功，重置尝试计数器
            if (verificationAttempt) {
              await tx.verificationAttempt.delete({
                where: { email: normalizedEmail },
              });
            }

            logger.debug('Verification successful', {
              email: normalizedEmail,
              userId: user.id,
              serverNow,
              tokenDeleted: true,
              attemptsReset: !!verificationAttempt,
            });

            // 注意：验证码已在此处删除，signIn事件中的批量删除作为补充清理

            const returnUser = {
              id: user.id,
              email: user.email,
              name:
                user.username ||
                user.firstName ||
                normalizedEmail.split('@')[0],
              image: user.photo,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              photo: user.photo,
            };

            return returnUser;
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error('OTP verification failed:', {
            email: normalizedEmail,
            error: errorMessage,
          });

          // 重新抛出已知错误
          if (Object.values(OTP_ERROR_CODES).includes(errorMessage as any)) {
            throw error;
          }

          // 未知错误
          throw new Error(OTP_ERROR_CODES.VERIFICATION_FAILED);
        }
      },
    }),
    // 邮件provider - 用于发送验证码
    EmailProvider({
      async generateVerificationToken() {
        // 🔒 使用加密安全的随机数生成器生成6位数字验证码
        // 在事务保护下，crypto.randomInt() 完全安全可靠
        const crypto = await import('crypto');
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += crypto.randomInt(0, 10).toString();
        }
        return code;
      },

      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.RESEND_EMAIL,
      sendVerificationRequest: async ({ identifier, token }) => {
        // 邮箱统一小写处理
        const normalizedEmail = identifier.toLowerCase().trim();

        try {
          // 🚀 使用统一时间上下文，确保时间一致性
          const { nowMs: serverNow, nowDt } = makeTimeCtx();
          const requestStartTime = Date.now();

          // 🚀 EmailProvider 内唯一裁决：所有限流/并发控制在此处确保原子性
          await prisma.$transaction(
            async (tx) => {
              // 🔒 1. 检查邮箱是否被屏蔽
              const isBlocked = await tx.blockedEmail.findUnique({
                where: { email: normalizedEmail },
              });

              if (isBlocked) {
                logger.debug('OTP request blocked for email:', normalizedEmail);
                throw new Error('BLOCKED_EMAIL');
              }

              // 🔒 2. 检查发送频率限制 - 基于最近一次创建时间（不筛过期）
              const lastToken = await tx.verificationToken.findFirst({
                where: { identifier: normalizedEmail },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
              });

              if (lastToken) {
                const rateLimitEndTime =
                  lastToken.createdAt.getTime() + RATE_LIMIT_MS;
                if (serverNow < rateLimitEndTime) {
                  const remainingSeconds = Math.ceil(
                    (rateLimitEndTime - serverNow) / 1000,
                  );
                  logger.debug('OTP rate limited for email:', normalizedEmail, {
                    remainingSeconds,
                  });
                  throw new Error(`RATE_LIMITED:${remainingSeconds}`);
                }
              }

              // 🔒 3. 检查未过期验证码数量，如果超过限制则清理最旧的
              const activeTokens = await tx.verificationToken.findMany({
                where: {
                  identifier: normalizedEmail,
                  expires: { gt: nowDt },
                },
                orderBy: { createdAt: 'asc' }, // 最旧的在前
              });

              // 如果已有验证码数量 >= 限制，删除最旧的，为新验证码腾出空间
              if (activeTokens.length >= MAX_ACTIVE_TOKENS_PER_EMAIL) {
                const tokensToDelete = activeTokens.slice(
                  0,
                  activeTokens.length - MAX_ACTIVE_TOKENS_PER_EMAIL + 1,
                );
                await tx.verificationToken.deleteMany({
                  where: {
                    identifier: normalizedEmail,
                    token: { in: tokensToDelete.map((t) => t.token) },
                  },
                });

                logger.debug(
                  'Cleaned old active tokens to make room for new one',
                  {
                    email: normalizedEmail,
                    deletedCount: tokensToDelete.length,
                  },
                );
              }

              // 🚀 4. 清理过期验证码
              const deletedExpired = await tx.verificationToken.deleteMany({
                where: {
                  identifier: normalizedEmail,
                  expires: { lt: nowDt },
                },
              });

              if (deletedExpired.count > 0) {
                logger.debug('Cleaned expired tokens before sending new OTP', {
                  email: normalizedEmail,
                  deletedCount: deletedExpired.count,
                });
              }

              // 🚀 5. 所有检查通过，验证码将由 NextAuth 自动插入数据库
              logger.debug('OTP eligibility check passed', {
                email: normalizedEmail,
                serverNow,
                activeTokensCount: activeTokens.length,
                lastTokenAge: lastToken
                  ? Math.floor(
                      (serverNow - lastToken.createdAt.getTime()) / 1000,
                    )
                  : null,
                requestId: Math.random().toString(36).substring(7), // 追踪并发请求
              });
            },
            {
              isolationLevel: 'Serializable', // 🔒 最高隔离级别，防止并发竞态
            },
          );

          // 🚀 6. 发送邮件（在事务外执行，避免长时间锁定）
          try {
            await resend.emails.send({
              from: kashEmail,
              to: [normalizedEmail],
              subject: '欢迎来到 Solar Earn',
              react: OTPTemplate({ token }),
              replyTo: replyToEmail,
            });
            logger.debug('OTP email sent successfully', {
              email: normalizedEmail,
              tokenCreatedAt: new Date().toISOString(),
              emailSentAt: new Date().toISOString(),
              processingTime: Date.now() - requestStartTime,
              // 不记录验证码信息，提高安全性
            });
          } catch (error) {
            logger.error('Failed to send OTP email:', {
              email: normalizedEmail,
              error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('EMAIL_SEND_FAILED');
          }
        } catch (error) {
          // 🔧 关键修复：改进错误处理和清理逻辑，防止竞态条件
          try {
            // 🔒 时间窗口保护：只清理刚创建的验证码（30秒内）
            const cleanupStartTime = Date.now() - 30 * 1000; // 30秒前
            const deleted = await prisma.verificationToken.deleteMany({
              where: {
                identifier: normalizedEmail,
                token: token,
                // 只删除最近创建的验证码，避免误删其他验证码
                createdAt: {
                  gte: new Date(cleanupStartTime),
                },
              },
            });

            logger.debug('Cleaned up verification token after failure', {
              email: normalizedEmail,
              deletedCount: deleted.count,
              cleanupTimeWindow: '30s',
              error: error instanceof Error ? error.message : String(error),
            });
          } catch (cleanupError) {
            logger.error('Failed to cleanup verification token:', {
              email: normalizedEmail,
              originalError:
                error instanceof Error ? error.message : String(error),
              cleanupError:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            });
          }

          // 重新抛出原始错误
          throw error;
        }
      },
      maxAge: TOKEN_EXPIRE_SEC, // 使用统一的验证码有效期常量（秒）
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account: _account }) {
      // 如果是email provider，在这里不做额外验证
      // 让NextAuth处理token验证，失败时会自动跳转到error页面
      if (_account?.provider === 'email') {
        const userRecord = await prisma.user.findUnique({
          where: { email: user.email as string },
          select: { isBlocked: true },
        });

        if (userRecord?.isBlocked) {
          return '/blocked';
        }

        return true;
      }

      const userRecord = await prisma.user.findUnique({
        where: { email: user.email as string },
        select: { isBlocked: true },
      });

      if (userRecord?.isBlocked) {
        return '/blocked';
      }

      return true;
    },
    async jwt({ token, user, account: _account }) {
      // 🔧 修复JWT token构建逻辑，避免属性冲突和数据类型问题
      if (user) {
        // 首次登录时，将用户信息添加到token中
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        // 🔧 修复：使用类型安全的方式访问用户属性
        const userAny = user as any;
        if (userAny.firstName) token.firstName = userAny.firstName;
        if (userAny.lastName) token.lastName = userAny.lastName;
        if (userAny.photo) token.photo = userAny.photo;
        if (userAny.role) token.role = userAny.role;
        if (userAny.location) token.location = userAny.location;
      }

      return token;
    },
    async session({ session, token }) {
      // 🔧 修复session构建逻辑，确保数据类型一致
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;

        // 🔧 修复：使用类型安全的方式设置额外属性
        const sessionUserAny = session.user as any;
        const tokenAny = token as any;

        sessionUserAny.name = token.name as string;
        sessionUserAny.image = token.image as string;

        if (tokenAny.firstName) sessionUserAny.firstName = tokenAny.firstName;
        if (tokenAny.lastName) sessionUserAny.lastName = tokenAny.lastName;
        if (tokenAny.photo) sessionUserAny.photo = tokenAny.photo;
        if (tokenAny.role) sessionUserAny.role = tokenAny.role;
        if (tokenAny.location) sessionUserAny.location = tokenAny.location;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account: _account }) {
      // 🚀 OTP登录成功后，批量删除该邮箱的所有未过期验证码
      if (_account?.provider === 'otp') {
        try {
          const { nowDt } = makeTimeCtx();
          const deletedCount = await prisma.verificationToken.deleteMany({
            where: {
              identifier: user.email as string,
              expires: { gt: nowDt },
            },
          });

          if (deletedCount.count > 0) {
            logger.debug('OTP tokens cleared after successful sign-in', {
              email: user.email,
              deletedCount: deletedCount.count,
            });
          }
        } catch (error) {
          logger.error('Failed to clear OTP tokens after sign-in:', {
            email: user.email,
            error: error instanceof Error ? error.message : String(error),
          });
          // 不阻断登录流程
        }
      }
    },
  },
  pages: {
    verifyRequest: '/verify-request',
    newUser: '/api/auth/new-user',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
