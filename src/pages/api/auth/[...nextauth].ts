import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { makeTimeCtx, OTP_CONFIG } from '@/lib/auth/constants';
import logger, { maskSensitiveData, maskSensitiveData } from '@/lib/logger';
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

          // 使用事务确保验证码一次性消费的原子性 - 优化为原子查+删模式
          return await prisma.$transaction(async (tx) => {
            // 🎯 原子验证：查找+删除同时进行，防止并发竞争

            // 统一时间计算 - 避免重复计算
            const toleranceThresholdMs =
              timeCtx.nowMs - OTP_CONFIG.VERIFICATION_TOLERANCE_MS;
            const toleranceThreshold = new Date(toleranceThresholdMs);

            // 第1步：原子查找并删除有效验证码
            const validToken = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
                expires: { gt: toleranceThreshold }, // 包含容错期
              },
              orderBy: {
                expires: 'desc', // 优先使用最晚过期的验证码
              },
            });

            // 🔍 [调试点1] 检查 DB 里这条 token 存在吗？过期没？
            console.log(`🔍 [DEBUG-${debugId}] 调试点1: 原子查找结果`, {
              found: !!validToken,
              email: normalizedEmail,
              inputCodeHash: maskSensitiveData.code(code),
              serverNow: timeCtx.nowMs,
              serverTime: timeCtx.serverTime,
            });

            if (!validToken) {
              console.log(
                `❌ [DEBUG-${debugId}] 验证码无效 - 不存在或已过期（含容错期）`,
                {
                  identifier: normalizedEmail,
                  token: code,
                  searchConditions: {
                    identifier: normalizedEmail,
                    token: code,
                    expiresAfter: toleranceThreshold.toISOString(),
                  },
                },
              );
              throw new Error('invalid_or_expired_code');
            }

            // 第2步：原子删除验证码，防止并发消费
            // 使用相同的查找条件进行删除，确保并发安全
            const { count } = await tx.verificationToken.deleteMany({
              where: {
                identifier: normalizedEmail,
                token: code,
                expires: { gt: toleranceThreshold }, // 与查找条件一致
              },
            });

            // 验证删除结果，确保只消费了一个验证码
            if (count !== 1) {
              console.log(`❌ [DEBUG-${debugId}] 原子删除失败 - 并发竞争检测`, {
                expectedDeleteCount: 1,
                actualDeleteCount: count,
                identifier: normalizedEmail,
                token: code,
                reason:
                  count === 0
                    ? '验证码已被其他请求消费'
                    : '删除了多个验证码（不应发生）',
                actionType: 'ATOMIC_DELETE_RACE_CONDITION',
              });
              throw new Error('invalid_or_expired_code');
            }

            // 🔍 [调试点2] 原子删除成功，记录验证码详细信息
            const tokenCreatedMs = validToken.createdAt.getTime();
            const tokenExpiresMs = validToken.expires.getTime();
            const isTokenExpired = timeCtx.nowMs > tokenExpiresMs;
            const tolerantExpireMs =
              tokenExpiresMs + OTP_CONFIG.VERIFICATION_TOLERANCE_MS;
            const isInTolerancePeriod = timeCtx.nowMs <= tolerantExpireMs;

            console.log(`✅ [DEBUG-${debugId}] 原子查+删成功，验证码详细信息`, {
              tokenHash: maskSensitiveData.code(validToken.token),
              tokenId: validToken.identifier,
              createdAt: validToken.createdAt.toISOString(),
              expiresAt: validToken.expires.toISOString(),
              tokenCreatedMs,
              tokenExpiresMs,
              serverNow: timeCtx.nowMs,
              isTokenExpired,
              tolerantExpireMs: tolerantExpireMs,
              isInTolerancePeriod,
              timeDifference: timeCtx.nowMs - tokenExpiresMs,
              ageInSeconds: Math.round((timeCtx.nowMs - tokenCreatedMs) / 1000),
              expiresInSeconds: Math.round(
                (tokenExpiresMs - timeCtx.nowMs) / 1000,
              ),
              decision:
                timeCtx.nowMs <= tokenExpiresMs
                  ? 'VALID_NORMAL'
                  : 'VALID_TOLERANCE',
              deletedCount: count,
              actionType: 'ATOMIC_VERIFY_SUCCESS',
            });

            // 记录验证类型（正常期内 vs 容错期内）
            if (timeCtx.nowMs <= tokenExpiresMs) {
              console.log(`✅ [DEBUG-${debugId}] 验证码在正常有效期内`);
              logger.debug('OTP verification within normal validity period');
            } else {
              console.log(`⚠️ [DEBUG-${debugId}] 验证码在容错期内使用`, {
                expiredFor: timeCtx.nowMs - tokenExpiresMs,
                toleranceUsed: true,
              });
              logger.info('OTP verification succeeded with tolerance', {
                email: normalizedEmail,
                toleranceUsed: true,
                expiredFor: timeCtx.nowMs - tokenExpiresMs,
                tokenAge: timeCtx.nowMs - validToken.createdAt.getTime(),
              });
            }

            // 查找或创建用户
            let user = await tx.user.findUnique({
              where: { email: normalizedEmail },
            });

            const isNewUser = !user; // 🔧 修复：正确记录是否为新用户

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

            // 成功日志也使用统一时间基准
            const currentTimeCtx = makeTimeCtx();
            console.log(`🎉 [DEBUG-${debugId}] OTP验证完全成功`, {
              userId: user.id,
              userEmail: user.email,
              userName: successResult.name,
              isNewUser: isNewUser, // 🔧 修复：使用正确的新用户标识
              totalProcessTime: currentTimeCtx.nowMs - timeCtx.nowMs,
              finalResult: 'SUCCESS',
            });

            return successResult;
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // 🔍 详细的错误调试信息 - 使用统一时间基准
          const currentTimeCtx = makeTimeCtx();
          console.log(`💥 [DEBUG-${debugId}] OTP验证失败 - 异常详情`, {
            errorMessage,
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
            email: normalizedEmail,
            inputCodeHash: maskSensitiveData.code(code),
            failureTime: currentTimeCtx.serverTime,
            totalProcessTime: currentTimeCtx.nowMs - timeCtx.nowMs,
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
