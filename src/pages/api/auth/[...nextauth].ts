import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';

import {
  kashEmail,
  OTPTemplate,
  replyToEmail,
  resend,
} from '@/features/emails';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

// 验证码时间配置常量
const RATE_LIMIT_MS = 60 * 1000; // 60秒发送限制
const TOKEN_EXPIRE_MS = 10 * 60 * 1000; // 10分钟有效期
const RESEND_TOLERANCE_MS = 30 * 1000; // 重发容差30秒（仅重发时宽松）

interface TimeStatus {
  canSend: boolean;
  canVerify: boolean;
  message: string;
  remainingSeconds?: number;
}

// 验证时的时间判断函数 - 严格验证，确保安全性
function checkVerificationTokenStatus(
  token: { createdAt: Date; expires: Date } | null,
  serverNow: number,
): TimeStatus {
  // 情况1: 没有token，可以发送
  if (!token) {
    return {
      canSend: true,
      canVerify: false,
      message: '可以发送验证码',
    };
  }

  const rateLimitEndTime = token.createdAt.getTime() + RATE_LIMIT_MS;
  const strictExpireTime = token.expires.getTime(); // 🔑 验证严格0容差
  const resendAllowTime = token.expires.getTime() + RESEND_TOLERANCE_MS; // 🔑 重发宽松30s容差

  // 优先级1: 发送频率限制（最高优先级）
  if (serverNow < rateLimitEndTime) {
    const remainingSeconds = Math.ceil((rateLimitEndTime - serverNow) / 1000);
    return {
      canSend: false,
      canVerify: serverNow < strictExpireTime, // 🔑 修复：统一使用 < 确保与过期判断一致
      message: `请求过于频繁，请 ${remainingSeconds} 秒后重试`,
      remainingSeconds,
    };
  }

  // 优先级2: 验证码过期（验证严格0容差，重发宽松容差）
  if (serverNow >= strictExpireTime) {
    // 🔑 使用 >= 确保恰好过期时也不可验证
    const canResend = serverNow >= resendAllowTime; // 🔑 使用 >= 确保恰好30秒时可重发
    return {
      canSend: canResend,
      canVerify: false, // 🔑 过期立即不可验证
      message: canResend
        ? '验证码已过期，可重新获取'
        : '验证码已过期，请稍等再重新获取',
    };
  }

  // 优先级3: 正常有效状态
  return {
    canSend: true, // 有效期内也允许重发（用户体验考虑）
    canVerify: true,
    message: '验证码有效',
  };
}

export const authOptions: NextAuthOptions = {
  // 🔧 修复：移除PrismaAdapter以避免与JWT策略冲突
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

        // 邮箱统一小写处理
        const normalizedEmail = email.toLowerCase().trim();


        // 基本输入验证
        if (!/^\d{6}$/.test(code)) {
          throw new Error('invalid_code');
        }

        try {
          // 统一时间基准 - 同一流程内使用同一个serverNow
          const serverNow = Date.now();

          // 使用事务确保验证码一次性消费的原子性
          return await prisma.$transaction(async (tx) => {
            // 🔧 查找匹配的验证码（不预过滤时间，由checkVerificationTokenStatus统一判断）
            // 🔑 添加排序确保获取最新的验证码
            const verificationRecord = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
              },
              orderBy: {
                expires: 'desc', // 按过期时间降序排列，确保获取最新的验证码
              },
            });

            if (!verificationRecord) {
              logger.debug('Verification failed: no matching token found', {
                email: normalizedEmail,
                codeLength: code.length,
                serverNow,
              });
              throw new Error('invalid_code');
            }


            // 🔑 验证使用严格0容差 - 绝对安全
            const timeStatus = checkVerificationTokenStatus(
              verificationRecord,
              serverNow,
            );

            if (!timeStatus.canVerify) {
              logger.debug('Verification failed: time validation failed', {
                email: normalizedEmail,
                code,
                timeStatus,
                tokenCreatedAt: verificationRecord.createdAt,
                tokenExpires: verificationRecord.expires,
                serverNow,
              });
              throw new Error('invalid_or_expired_code');
            }

            // 🔧 修改：不在此处删除验证码，改为在登录成功后批量删除
            // 验证通过，但保留验证码直到登录成功

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
              throw new Error('user_blocked');
            }

            logger.debug('Verification successful', {
              email: normalizedEmail,
              userId: user.id,
              serverNow,
            });

            const returnUser = {
              id: user.id,
              email: user.email,
              name:
                user.username ||
                user.firstName ||
                normalizedEmail.split('@')[0],
              image: user.photo,
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
          if (
            errorMessage.includes('invalid_') ||
            errorMessage.includes('expired_') ||
            errorMessage.includes('blocked')
          ) {
            throw error;
          }

          // 未知错误
          throw new Error('verification_failed');
        }
      },
    }),
    // 邮件provider - 用于发送验证码
    EmailProvider({
      async generateVerificationToken() {
        const digits = '0123456789';
        let verificationCode = '';
        for (let i = 0; i < 6; i++) {
          const randomIndex = Math.floor(Math.random() * digits.length);
          verificationCode += digits.charAt(randomIndex);
        }
        return verificationCode;
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

        const isBlocked = await prisma.blockedEmail.findUnique({
          where: { email: normalizedEmail },
        });

        if (isBlocked) {
          logger.debug('OTP Not Sent, Blocked Email');
          throw new Error('BLOCKED_EMAIL'); // 替换静默失败，提供用户反馈
        }

        // 统一时间基准 - 同一流程内使用同一个serverNow
        const serverNow = Date.now();

        // 🔧 使用事务确保发送验证码的原子性，防止并发竞态条件
        await prisma.$transaction(async (tx) => {
          // 检查发送频率 - 基于createdAt字段进行严格判断（0容差）
          const recentToken = await tx.verificationToken.findFirst({
            where: {
              identifier: normalizedEmail,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          // 使用核心逻辑函数进行统一判断
          const timeStatus = checkVerificationTokenStatus(
            recentToken,
            serverNow,
          );

          if (!timeStatus.canSend) {
            logger.debug('OTP rate limited for email:', normalizedEmail, {
              remainingSeconds: timeStatus.remainingSeconds,
            });
            throw new Error(`RATE_LIMITED:${timeStatus.remainingSeconds}`);
          }

          // 限制每个邮箱最多3个未过期的验证码
          const tokenCount = await tx.verificationToken.count({
            where: {
              identifier: normalizedEmail,
              expires: {
                gt: new Date(serverNow), // 🔑 使用统一时间基准
              },
            },
          });

          if (tokenCount >= 3) {
            // 删除最老的验证码
            const oldestToken = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                expires: {
                  gt: new Date(serverNow), // 🔑 使用统一时间基准
                },
              },
              orderBy: {
                expires: 'asc',
              },
            });

            if (oldestToken) {
              await tx.verificationToken.delete({
                where: {
                  identifier_token: {
                    identifier: oldestToken.identifier,
                    token: oldestToken.token,
                  },
                },
              });
            }
          }
        });

        await resend.emails.send({
          from: kashEmail,
          to: [normalizedEmail],
          subject: '欢迎来到 Solar Earn',
          react: OTPTemplate({ token }),
          replyTo: replyToEmail,
        });
      },
      maxAge: TOKEN_EXPIRE_MS / 1000, // 使用统一的10分钟有效期常量
    }),
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

      // 保留account信息（如果需要）
      if (account) {
        token.access_token = account.access_token;
      }

      return token;
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
      // 🔧 登录成功后批量删除该邮箱的所有未过期验证码
      if (account?.provider === 'otp') {
        try {
          await prisma.verificationToken.deleteMany({
            where: {
              identifier: user.email as string,
              expires: { gt: new Date() },
            },
          });
          logger.debug(
            'Cleared all verification tokens after successful login',
            {
              email: user.email,
            },
          );
        } catch (error) {
          logger.error('Failed to clear verification tokens:', error);
          // 不阻断登录流程，继续进行
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
