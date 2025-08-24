import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import EmailProvider from 'next-auth/providers/email';

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
        const isBlocked = await prisma.blockedEmail.findUnique({
          where: { email: identifier },
        });

        if (isBlocked) {
          logger.debug('OTP Not Sent, Blocked Email');
          throw new Error('BLOCKED_EMAIL'); // 替换静默失败，提供用户反馈
        }

        // 检查发送频率 - 防止同一邮箱1分钟内重复发送
        const recentToken = await prisma.verificationToken.findFirst({
          where: {
            identifier,
            expires: {
              gt: new Date(Date.now() - 60 * 1000), // 1分钟内
            },
          },
        });

        if (recentToken) {
          logger.debug('OTP rate limited for email:', identifier);
          throw new Error('RATE_LIMITED'); // 替换静默失败，提供用户反馈
        }

        // 限制每个邮箱最多3个未过期的验证码
        const tokenCount = await prisma.verificationToken.count({
          where: {
            identifier,
            expires: {
              gt: new Date(),
            },
          },
        });

        if (tokenCount >= 3) {
          // 删除最老的验证码
          const oldestToken = await prisma.verificationToken.findFirst({
            where: {
              identifier,
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
          to: [identifier],
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
