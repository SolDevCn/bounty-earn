#!/usr/bin/env node

/**
 * 验证码登录问题诊断脚本
 * 用于快速检查配置和数据库状态
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseAuth() {
  console.log('🔍 开始验证码登录问题诊断...\n');

  // 1. 检查环境变量
  console.log('📋 检查环境变量:');
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL', 
    'DATABASE_URL',
    'RESEND_API_KEY'
  ];

  let envIssues = 0;
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      envIssues++;
    } else {
      console.log(`✅ ${varName}: 已设置 (${value.substring(0, 10)}...)`);
    }
  });

  if (envIssues > 0) {
    console.log(`\n⚠️  发现 ${envIssues} 个环境变量问题\n`);
  } else {
    console.log('\n✅ 所有必需的环境变量都已设置\n');
  }

  // 2. 检查数据库连接和验证码状态
  console.log('🗄️  检查数据库状态:');
  
  try {
    const prisma = new PrismaClient();
    
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 检查验证码表
    const tokenCount = await prisma.verificationToken.count();
    console.log(`📊 验证码总数: ${tokenCount}`);

    // 检查最近的验证码
    const recentTokens = await prisma.verificationToken.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        identifier: true,
        token: true,
        expires: true,
        createdAt: true
      }
    });

    if (recentTokens.length > 0) {
      console.log('\n📋 最近的验证码记录:');
      recentTokens.forEach((token, index) => {
        const now = new Date();
        const isExpired = token.expires < now;
        const timeLeft = Math.max(0, Math.floor((token.expires.getTime() - now.getTime()) / 1000));
        
        console.log(`${index + 1}. ${token.identifier}`);
        console.log(`   验证码: ${token.token}`);
        console.log(`   创建时间: ${token.createdAt.toISOString()}`);
        console.log(`   过期时间: ${token.expires.toISOString()}`);
        console.log(`   状态: ${isExpired ? '❌ 已过期' : `✅ 有效 (剩余${timeLeft}秒)`}`);
        console.log('');
      });
    } else {
      console.log('📭 没有找到验证码记录');
    }

    // 检查用户表
    const userCount = await prisma.user.count();
    console.log(`👥 用户总数: ${userCount}`);

    // 检查是否有重复的验证码
    const duplicateTokens = await prisma.$queryRaw`
      SELECT identifier, token, COUNT(*) as count
      FROM VerificationToken
      WHERE expires > NOW()
      GROUP BY identifier, token
      HAVING COUNT(*) > 1
    `;

    if (duplicateTokens.length > 0) {
      console.log('\n⚠️  发现重复的验证码:');
      duplicateTokens.forEach(dup => {
        console.log(`   ${dup.identifier}: ${dup.token} (${dup.count}个)`);
      });
    } else {
      console.log('✅ 没有发现重复的验证码');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.log('❌ 数据库检查失败:', error.message);
  }

  // 3. 提供诊断建议
  console.log('\n🎯 诊断建议:');
  console.log('1. 如果环境变量有问题，请检查 .env 文件');
  console.log('2. 如果有重复验证码，可能需要清理数据库');
  console.log('3. 检查服务器日志中的 🔍 [DEBUG] 信息');
  console.log('4. 确认验证码在有效期内（10分钟）');
  console.log('5. 检查浏览器控制台的错误信息');

  console.log('\n✨ 诊断完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  diagnoseAuth().catch(console.error);
}

module.exports = { diagnoseAuth };
