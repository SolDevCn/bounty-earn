#!/usr/bin/env node

/**
 * 测试验证码登录流程
 * 模拟完整的发送验证码 -> 验证登录流程
 */

const { PrismaClient } = require('@prisma/client');

async function testAuthFlow() {
  console.log('🧪 开始测试验证码登录流程...\n');

  const prisma = new PrismaClient();
  const testEmail = 'test@example.com';

  try {
    // 1. 清理测试数据
    console.log('🧹 清理测试数据...');
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail }
    });
    console.log('✅ 测试数据清理完成\n');

    // 2. 模拟发送验证码
    console.log('📧 模拟发送验证码...');
    const testCode = '123456';
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10分钟后过期

    await prisma.verificationToken.create({
      data: {
        identifier: testEmail,
        token: testCode,
        expires: expires
      }
    });
    console.log(`✅ 验证码已创建: ${testCode}`);
    console.log(`📅 过期时间: ${expires.toISOString()}\n`);

    // 3. 模拟验证码验证逻辑
    console.log('🔍 模拟验证码验证逻辑...');
    
    // 查询验证码（模拟 authorize 函数中的逻辑）
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: testEmail,
        token: testCode,
      },
      orderBy: {
        expires: 'desc', // 确保获取最新的验证码
      },
    });

    if (!verificationRecord) {
      console.log('❌ 验证码查询失败');
      return;
    }

    console.log('✅ 验证码查询成功');
    console.log(`📋 验证码信息:`, {
      identifier: verificationRecord.identifier,
      token: verificationRecord.token,
      expires: verificationRecord.expires,
      createdAt: verificationRecord.createdAt
    });

    // 4. 时间验证
    const serverNow = Date.now();
    const strictExpireTime = verificationRecord.expires.getTime();
    const isValid = serverNow < strictExpireTime;

    console.log('\n⏰ 时间验证:');
    console.log(`服务器时间: ${new Date(serverNow).toISOString()}`);
    console.log(`过期时间: ${verificationRecord.expires.toISOString()}`);
    console.log(`验证码状态: ${isValid ? '✅ 有效' : '❌ 已过期'}`);

    if (!isValid) {
      console.log('❌ 验证码已过期');
      return;
    }

    // 5. 用户查询/创建
    console.log('\n👤 用户查询/创建...');
    let user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: testEmail,
          username: testEmail.split('@')[0],
        },
      });
      console.log('✅ 新用户已创建');
    } else {
      console.log('✅ 用户已存在');
    }

    console.log(`👤 用户信息:`, {
      id: user.id,
      email: user.email,
      username: user.username,
      isBlocked: user.isBlocked
    });

    // 6. 检查用户状态
    if (user.isBlocked) {
      console.log('❌ 用户被屏蔽');
      return;
    }

    // 7. 模拟成功登录
    console.log('\n🎉 登录验证成功！');
    console.log('📋 返回的用户对象:', {
      id: user.id,
      email: user.email,
      name: user.username || user.firstName || testEmail.split('@')[0],
      image: user.photo,
    });

    // 8. 清理验证码（模拟登录成功后的清理）
    console.log('\n🧹 清理已使用的验证码...');
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: testEmail,
        expires: { gt: new Date() }
      }
    });
    console.log('✅ 验证码清理完成');

    console.log('\n✨ 测试流程完成 - 所有步骤都成功！');

  } catch (error) {
    console.log('\n❌ 测试过程中出现错误:', error.message);
    console.log('📋 错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAuthFlow().catch(console.error);
}

module.exports = { testAuthFlow };
