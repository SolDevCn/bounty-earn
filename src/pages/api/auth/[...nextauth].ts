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
          // 使用事务确保验证码一次性消费的原子性
          return await prisma.$transaction(async (tx) => {
            // 查找有效的验证码
            const verificationRecord = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
                expires: {
                  gt: new Date(), // 未过期
                },
              },
            });

            if (!verificationRecord) {
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

        // 检查发送频率 - 防止同一邮箱1分钟内重复发送
        const recentToken = await prisma.verificationToken.findFirst({
          where: {
            identifier: normalizedEmail,
            expires: {
              gt: new Date(Date.now() - 60 * 1000), // 1分钟内
            },
          },
        });

        if (recentToken) {
          // 计算剩余冷却时间（从最近token创建时间算起，60秒冷却）
          const tokenCreatedAt = new Date(recentToken.expires.getTime() - 10 * 60 * 1000); // token创建时间
          const elapsedSeconds = Math.floor((Date.now() - tokenCreatedAt.getTime()) / 1000);
          const remainingSeconds = Math.max(1, 60 - elapsedSeconds);
          
          logger.debug('OTP rate limited for email:', normalizedEmail);
          throw new Error(`RATE_LIMITED:${remainingSeconds}`); // 传递剩余时间
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
