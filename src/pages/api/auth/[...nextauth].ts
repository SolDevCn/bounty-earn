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
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

// 验证码时间配置常量
const TOKEN_EXPIRE_MS = 10 * 60 * 1000; // 10分钟有效期

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
          // 统一时间基准 - 同一流程内使用同一个serverNow
          const serverNow = Date.now();
          const nowDt = new Date(serverNow);

          // 使用事务确保验证码一次性消费的原子性
          return await prisma.$transaction(async (tx) => {
            // 🔑 验证裁决 - 精确匹配，不需要排序
            const verificationRecord = await tx.verificationToken.findFirst({
              where: {
                identifier: normalizedEmail,
                token: code,
                expires: {
                  gt: nowDt, // 严格0容差：expires > now
                },
              },
            });

            if (!verificationRecord) {
              logger.debug('Verification failed: no valid token found', {
                email: normalizedEmail,
                codeLength: code.length,
                serverNow: new Date(serverNow),
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

        // 🔧 优化：移除限流检查逻辑，只负责发送邮件和清理
        // 限流检查已前置到 /api/auth/request-otp 端点

        // 清理过期验证码（可选优化，避免数据库垃圾积累）
        // 使用统一时间基准
        const cleanupTimeMs = Date.now();
        const cleanupTimeDt = new Date(cleanupTimeMs);
        await prisma.verificationToken.deleteMany({
          where: {
            identifier: normalizedEmail,
            expires: {
              lt: cleanupTimeDt, // 删除已过期的验证码
            },
          },
        });

        // 发送邮件
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
            token: token.substring(0, 2) + '****', // 日志中只显示前两位
          });
        } catch (error) {
          logger.error('Failed to send OTP email:', {
            email: normalizedEmail,
            error: error instanceof Error ? error.message : String(error),
          });
          throw new Error('EMAIL_SEND_FAILED');
        }
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
      if (account?.access_token) {
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
          const email = String(user.email || '')
            .toLowerCase()
            .trim();
          const nowMs = Date.now();
          const nowDt = new Date(nowMs);
          await prisma.verificationToken.deleteMany({
            where: {
              identifier: email,
              expires: { gt: nowDt },
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
