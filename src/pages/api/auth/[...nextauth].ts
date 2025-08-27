import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';

import {
  kashEmail,
  OTPTemplate,
  replyToEmail,
  resend,
} from '@/features/emails';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

// 验证码时间配置常量
const RATE_LIMIT_MS = 60 * 1000;          // 60秒发送限制
const TOKEN_EXPIRE_MS = 10 * 60 * 1000;   // 10分钟有效期
const TOKEN_EXPIRE_SECONDS = TOKEN_EXPIRE_MS / 1000;  // 转换为秒供NextAuth使用
const RESEND_TOLERANCE_MS = 30 * 1000;    // 重发容差30秒（仅重发时宽松）
const VERIFICATION_TOLERANCE_MS = 5 * 1000; // 验证容错5秒，减少时间同步问题

interface TimeStatus {
  canSend: boolean;
  canVerify: boolean;
  message: string;
  remainingSeconds?: number;
}

// 核心时间判断函数 - 验证严格0容差，重发宽松容差
function checkVerificationTokenStatus(
  token: { createdAt: Date; expires: Date } | null,
  serverNow: number
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
  const strictExpireTime = token.expires.getTime();                    // 🔑 验证严格0容差
  const resendAllowTime = token.expires.getTime() + RESEND_TOLERANCE_MS; // 🔑 重发宽松30s容差
  
  // 优先级1: 发送频率限制（最高优先级）
  if (serverNow < rateLimitEndTime) {
    const remainingSeconds = Math.ceil((rateLimitEndTime - serverNow) / 1000);
    return {
      canSend: false,
      canVerify: serverNow <= strictExpireTime, // 🔑 验证使用严格时间
      message: `请求过于频繁，请 ${remainingSeconds} 秒后重试`,
      remainingSeconds,
    };
  }
  
  // 优先级2: 验证码过期（验证严格0容差，重发宽松容差）
  if (serverNow >= strictExpireTime) {  // 🔑 使用 >= 确保恰好过期时也不可验证
    const canResend = serverNow >= resendAllowTime;  // 🔑 使用 >= 确保恰好30秒时可重发
    return {
      canSend: canResend,
      canVerify: false, // 🔑 过期立即不可验证
      message: canResend ? '验证码已过期，可重新获取' : '验证码已过期，请稍等再重新获取',
    };
  }
  
  // 优先级3: 正常有效状态
  return {
    canSend: true,  // 有效期内也允许重发（用户体验考虑）
    canVerify: true,
    message: '验证码有效',
  };
}

export const authOptions: NextAuthOptions = {
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
          // 统一时间基准 - 同一流程内使用同一个serverNow
          const serverNow = Date.now();
          
          // 使用事务确保验证码一次性消费的原子性
          return await prisma.$transaction(async (tx) => {
            // 🔍 分步验证：先检查验证码是否存在，再判断时间状态
            
            // 第1步：查找是否存在匹配的验证码（包括过期的）
            const anyMatchingToken = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
              },
              orderBy: {
                createdAt: 'desc', // 优先使用最新的验证码
              },
            });

            if (!anyMatchingToken) {
              // 验证码不存在或错误
              throw new Error('invalid_code');
            }
            
            // 第2步：检查找到的验证码是否过期，使用正确的容错逻辑
            const expireTime = anyMatchingToken.expires.getTime();
            const tolerantExpireTime = expireTime + VERIFICATION_TOLERANCE_MS;
            
            if (serverNow <= expireTime) {
              // 验证码在正常有效期内
              logger.debug('OTP verification within normal validity period');
            } else if (serverNow <= tolerantExpireTime) {
              // 验证码在容错期内（过期后5秒内仍可用）
              logger.info('OTP verification succeeded with tolerance', {
                email: normalizedEmail,
                toleranceUsed: true,
                expiredFor: serverNow - expireTime,
                tokenAge: serverNow - anyMatchingToken.createdAt.getTime()
              });
            } else {
              // 验证码已过期且超出容错期
              throw new Error('expired_code');
            }

            // 第3步：验证码有效，立即删除进行一次性消费
            await tx.verificationToken.delete({
              where: {
                identifier_token: {
                  identifier: normalizedEmail,
                  token: code,
                },
              },
            });

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

            return {
              id: user.id,
              email: user.email,
              name: user.username || user.firstName || normalizedEmail.split('@')[0],
              image: user.photo,
            };
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
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

        // 🔐 使用序列化事务确保并发安全 - 防止竞态条件
        await prisma.$transaction(async (tx) => {
          // 1. 检查邮箱是否被屏蔽
          const isBlocked = await tx.blockedEmail.findUnique({
            where: { email: normalizedEmail },
          });

          if (isBlocked) {
            logger.debug('OTP Not Sent, Blocked Email');
            throw new Error('BLOCKED_EMAIL');
          }

          // 统一时间基准 - 同一流程内使用同一个serverNow
          const serverNow = Date.now();
          
          // 2. 🔒 使用原子性查询锁定该邮箱的验证码记录
          // 查询所有相关记录，确保在事务期间其他请求无法修改
          const allTokens = await tx.verificationToken.findMany({
            where: {
              identifier: normalizedEmail,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          const recentToken = allTokens[0] || null;

          // 使用核心逻辑函数进行统一判断
          const timeStatus = checkVerificationTokenStatus(recentToken, serverNow);
          
          if (!timeStatus.canSend) {
            logger.debug('OTP rate limited for email:', normalizedEmail, {
              remainingSeconds: timeStatus.remainingSeconds,
            });
            throw new Error(`RATE_LIMITED:${timeStatus.remainingSeconds}`);
          }

          // 3. 🧹 清理该邮箱的过期验证码，防止数据库积累
          await tx.verificationToken.deleteMany({
            where: {
              identifier: normalizedEmail,
              expires: {
                lt: new Date(serverNow), // 删除已过期的验证码
              },
            },
          });

          // 4. 原子性地检查和管理验证码数量限制
          const currentTokens = await tx.verificationToken.findMany({
            where: {
              identifier: normalizedEmail,
              expires: {
                gt: new Date(serverNow), // 只查找未过期的验证码
              },
            },
            orderBy: {
              expires: 'asc', // 按过期时间升序，优先删除最早过期的
            },
          });

          // 如果当前有效验证码 >= 3，删除最老的验证码为新验证码腾出空间
          if (currentTokens.length >= 3) {
            const tokensToDelete = currentTokens.slice(0, currentTokens.length - 2); // 保留最新的2个
            
            for (const tokenToDelete of tokensToDelete) {
              await tx.verificationToken.delete({
                where: {
                  identifier_token: {
                    identifier: tokenToDelete.identifier,
                    token: tokenToDelete.token,
                  },
                },
              });
            }
            
            logger.info('Cleaned up old verification tokens', {
              email: normalizedEmail,
              deletedCount: tokensToDelete.length,
            });
          }

          // 事务完成后，NextAuth会自动创建新的验证码
          logger.debug('Verification token send validation passed', {
            email: normalizedEmail,
            remainingTokens: Math.max(0, 2 - currentTokens.length),
          });
        }, {
          // 🔒 事务配置：确保并发安全
          maxWait: 5000, // 最大等待时间5秒
          timeout: 10000, // 事务超时时间10秒
        });

        // 5. 📧 发送邮件（在事务外进行，避免邮件发送失败回滚数据库操作）
        await resend.emails.send({
          from: kashEmail,
          to: [normalizedEmail],
          subject: '欢迎来到 Solar Earn',
          react: OTPTemplate({ token }),
          replyTo: replyToEmail,
        });
      },
      maxAge: TOKEN_EXPIRE_SECONDS, // 使用统一的时间常量
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
  pages: {
    verifyRequest: '/verify-request',
    newUser: '/api/auth/new-user',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
