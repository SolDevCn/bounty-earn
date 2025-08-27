import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { makeTimeCtx, OTP_CONFIG } from '@/lib/auth/constants';
import logger, { maskSensitiveData } from '@/lib/logger';
import { prisma } from '@/prisma';

export const authOptions: NextAuthOptions = {
  // 🔧 修复: 完全移除适配器，避免与JWT策略冲突
  // 我们自定义验证码发送，不使用 EmailProvider
  // adapter: PrismaAdapter(prisma) as Adapter,
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

        // 🔍 DEBUG: 验证开始 - 使用统一时间基准
        const debugId = Math.random().toString(36).substring(2, 11);
        const timeCtx = makeTimeCtx(); // 统一时间基准
        console.log(`🔍 [DEBUG-${debugId}] OTP验证开始`, {
          timestamp: timeCtx.serverTime,
          email: email,
          codeLength: code?.length,
          codeHash: maskSensitiveData.code(code), // 🔒 安全：只显示前2位
        });

        // 邮箱统一小写处理
        const normalizedEmail = email.toLowerCase().trim();

        // 基本输入验证
        if (!/^\d{6}$/.test(code)) {
          console.log(`❌ [DEBUG-${debugId}] 验证码格式错误`, {
            codeHash: maskSensitiveData.code(code),
            codeLength: code.length,
            codeType: typeof code,
          });
          throw new Error('invalid_code');
        }

        try {
          console.log(`⏰ [DEBUG-${debugId}] 时间基准设置`, {
            serverNow: timeCtx.nowMs,
            serverTime: timeCtx.serverTime,
          });

          // 使用事务确保验证码一次性消费的原子性 - 🎯 带条件的原子删除模式
          return await prisma.$transaction(async (tx) => {
            // 🎯 原子验证：直接删除满足条件的验证码，以删除结果为唯一裁决

            // 计算容错期阈值：当前时间减去容错期 = 最早可接受的过期时间
            const toleranceThresholdMs =
              timeCtx.nowMs - OTP_CONFIG.VERIFICATION_TOLERANCE_MS;
            const toleranceThreshold = new Date(toleranceThresholdMs);

            console.log(`🔍 [DEBUG-${debugId}] 原子删除验证开始`, {
              email: normalizedEmail,
              inputCodeHash: maskSensitiveData.code(code),
              serverNow: timeCtx.nowMs,
              serverTime: timeCtx.serverTime,
              toleranceThreshold: toleranceThreshold.toISOString(),
              strategy: 'ATOMIC_DELETE_ONLY',
            });

            // 🎯 关键：先查唯一，再删唯一 - 确保一次只消费一条明确的验证码记录

            // 1. 先查唯一：使用复合唯一键查找验证码
            const targetToken = await tx.verificationToken.findUnique({
              where: {
                identifier_token: {
                  identifier: normalizedEmail,
                  token: code,
                },
              },
            });

            // 2. 验证存在性
            if (!targetToken) {
              console.log(`❌ [DEBUG-${debugId}] 验证码不存在或已被消费`, {
                identifier: normalizedEmail,
                inputCodeHash: maskSensitiveData.code(code),
                reason: 'token_not_found',
                toleranceThreshold: toleranceThreshold.toISOString(),
                actionType: 'FIND_FAILED',
              });

              throw new Error('invalid_or_expired_code');
            }

            // 3. 过期判断：在查到记录后验证容错期
            if (targetToken.expires.getTime() <= toleranceThreshold.getTime()) {
              console.log(`❌ [DEBUG-${debugId}] 验证码已过期（超出容错期）`, {
                identifier: normalizedEmail,
                inputCodeHash: maskSensitiveData.code(code),
                tokenExpires: targetToken.expires.toISOString(),
                toleranceThreshold: toleranceThreshold.toISOString(),
                expiredBy: `${(toleranceThreshold.getTime() - targetToken.expires.getTime()) / 1000}秒`,
                actionType: 'EXPIRED_CHECK_FAILED',
              });

              throw new Error('invalid_or_expired_code');
            }

            // 4. 再删唯一：使用复合唯一键精确删除
            try {
              await tx.verificationToken.delete({
                where: {
                  identifier_token: {
                    identifier: normalizedEmail,
                    token: code,
                  },
                },
              });

              // 🎉 删除成功 = 验证码有效且已消费
              console.log(
                `✅ [DEBUG-${debugId}] 验证码验证成功 - 已安全消费`,
                {
                  identifier: normalizedEmail,
                  inputCodeHash: maskSensitiveData.code(code),
                  tokenExpires: targetToken.expires.toISOString(),
                  toleranceThreshold: toleranceThreshold.toISOString(),
                  actionType: 'VERIFY_SUCCESS',
                  note: '验证码已被安全消费，无法重复使用',
                },
              );
            } catch (deleteError: any) {
              // 删除失败：可能被其他并发请求删除
              if (deleteError?.code === 'P2025') {
                console.log(`❌ [DEBUG-${debugId}] 验证码已被其他请求消费`, {
                  identifier: normalizedEmail,
                  inputCodeHash: maskSensitiveData.code(code),
                  reason: 'consumed_by_concurrent_request',
                  actionType: 'DELETE_FAILED_CONCURRENT',
                });

                throw new Error('invalid_or_expired_code');
              }

              // 其他删除错误
              throw deleteError;
            }

            // 记录验证成功（无需详细的时间分析，因为删除成功就证明有效）
            logger.info('OTP verification succeeded via atomic delete', {
              email: normalizedEmail,
              serverTime: timeCtx.serverTime,
              toleranceUsed: 'unknown_but_within_tolerance_period',
            });

            // 查找或创建用户
            let user = await tx.user.findUnique({
              where: { email: normalizedEmail },
            });

            const isNewUser = !user; // 记录是否为新用户

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
              throw new Error('user_blocked');
            }

            // 🎉 验证成功，返回用户信息
            const successResult = {
              id: user.id,
              email: user.email,
              name:
                user.username ||
                user.firstName ||
                normalizedEmail.split('@')[0],
              image: user.photo,
            };

            // 简化的成功日志 - 原子删除成功就证明验证有效
            console.log(`🎉 [DEBUG-${debugId}] OTP验证完全成功`, {
              userId: user.id,
              userEmail: user.email,
              userName: successResult.name,
              isNewUser: isNewUser,
              strategy: 'ATOMIC_DELETE_VERIFICATION',
              finalResult: 'SUCCESS',
            });

            return successResult;
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // 🔍 详细的错误调试信息
          console.log(`💥 [DEBUG-${debugId}] OTP验证失败 - 异常详情`, {
            errorMessage,
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
            email: normalizedEmail,
            inputCodeHash: maskSensitiveData.code(code),
            failureTime: new Date().toISOString(),
            strategy: 'ATOMIC_DELETE_VERIFICATION',
            finalResult: 'FAILURE',
          });

          logger.error('OTP verification failed:', {
            email: normalizedEmail,
            error: errorMessage,
          });

          // 重新抛出已知错误
          if (
            errorMessage.includes('invalid_') ||
            errorMessage.includes('expired_') ||
            errorMessage.includes('blocked')
          ) {
            console.log(
              `📤 [DEBUG-${debugId}] 重新抛出已知错误: ${errorMessage}`,
            );
            throw error;
          }

          // 未知错误
          console.log(
            `❓ [DEBUG-${debugId}] 未知错误，转换为 verification_failed`,
          );
          throw new Error('verification_failed');
        }
      },
    }),
    // 注意：移除了 EmailProvider，改用独立的 API 端点发送验证码
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // 如果是email provider，在这里不做额外验证
      // 让NextAuth处理token验证，失败时会自动跳转到error页面
      if (account?.provider === 'email') {
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
    async jwt({ token, user, account }) {
      return { ...token, ...user, ...account };
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.photo = token.photo;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.token = token.access_token;
      session.user.role = token.role;
      session.user.location = token.location;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      // 🔒 安全策略：不再清理其他验证码，避免删除用户刚请求的新验证码
      // 验证码安全依赖两个机制：
      // 1. authorize() 中精确删除本次使用的验证码（已实现）
      // 2. 自然过期（10分钟TTL）+ 定期后台清理
      logger.debug('User signed in successfully', {
        email: user.email,
        provider: account?.provider,
      });
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
