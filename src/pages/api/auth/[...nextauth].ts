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
const RESEND_TOLERANCE_MS = 30 * 1000;    // 重发容差30秒（仅重发时宽松）

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
  if (serverNow > strictExpireTime) {
    const canResend = serverNow > resendAllowTime;
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
            // 查找匹配的验证码（不检查过期，由统一逻辑处理）
            const verificationRecord = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
              },
            });

            if (!verificationRecord) {
              throw new Error('invalid_code');
            }
            
            // 🔑 验证使用严格0容差 - 绝对安全
            const timeStatus = checkVerificationTokenStatus(verificationRecord, serverNow);
            
            if (!timeStatus.canVerify) {
              throw new Error('invalid_or_expired_code');
            }

            // 一次性消费 - 立即删除验证码
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

        const isBlocked = await prisma.blockedEmail.findUnique({
          where: { email: normalizedEmail },
        });

        if (isBlocked) {
          logger.debug('OTP Not Sent, Blocked Email');
          throw new Error('BLOCKED_EMAIL'); // 替换静默失败，提供用户反馈
        }

        // 统一时间基准 - 同一流程内使用同一个serverNow
        const serverNow = Date.now();
        
        // 检查发送频率 - 基于createdAt字段进行严格判断（0容差）
        const recentToken = await prisma.verificationToken.findFirst({
          where: {
            identifier: normalizedEmail,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // 使用核心逻辑函数进行统一判断
        const timeStatus = checkVerificationTokenStatus(recentToken, serverNow);
        
        if (!timeStatus.canSend) {
          logger.debug('OTP rate limited for email:', normalizedEmail, {
            remainingSeconds: timeStatus.remainingSeconds,
          });
          throw new Error(`RATE_LIMITED:${timeStatus.remainingSeconds}`);
        }

        // 限制每个邮箱最多3个未过期的验证码
        const tokenCount = await prisma.verificationToken.count({
          where: {
            identifier: normalizedEmail,
            expires: {
              gt: new Date(),
            },
          },
        });

        if (tokenCount >= 3) {
          // 删除最老的验证码
          const oldestToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: normalizedEmail,
              expires: {
                gt: new Date(),
              },
            },
            orderBy: {
              expires: 'asc',
            },
          });

          if (oldestToken) {
            await prisma.verificationToken.delete({
              where: {
                identifier_token: {
                  identifier: oldestToken.identifier,
                  token: oldestToken.token,
                },
              },
            });
          }
        }

        await resend.emails.send({
          from: kashEmail,
          to: [normalizedEmail],
          subject: '欢迎来到 Solar Earn',
          react: OTPTemplate({ token }),
          replyTo: replyToEmail,
        });
      },
      maxAge: 10 * 60,
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
