#!/usr/bin/env node

/**
 * 验证码登录系统工具集
 * 统一管理所有验证码相关的诊断、测试和验证功能
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}\n`),
};

// 诊断功能
async function diagnose() {
  log.title('验证码登录系统诊断');

  // 检查环境变量
  log.info('检查环境变量...');
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'RESEND_API_KEY',
  ];
  let envIssues = 0;

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
      log.error(`${varName}: 未设置`);
      envIssues++;
    } else {
      log.success(`${varName}: 已设置`);
    }
  });

  if (envIssues > 0) {
    log.warning(`发现 ${envIssues} 个环境变量问题`);
    return false;
  }

  // 检查数据库
  log.info('检查数据库连接...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    log.success('数据库连接成功');

    const tokenCount = await prisma.verificationToken.count();
    log.info(`验证码总数: ${tokenCount}`);

    const userCount = await prisma.user.count();
    log.info(`用户总数: ${userCount}`);

    await prisma.$disconnect();
    return true;
  } catch (error) {
    log.error(`数据库连接失败: ${error.message}`);
    return false;
  }
}

// 测试功能
async function test() {
  log.title('验证码登录流程测试');

  const prisma = new PrismaClient();
  const testEmail = 'test@example.com';

  try {
    // 清理测试数据
    log.info('清理测试数据...');
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });

    // 创建测试验证码
    log.info('创建测试验证码...');
    const testCode = '123456';
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: testEmail,
        token: testCode,
        expires: expires,
        // 注意：当前数据库没有 createdAt 字段，所以不包含它
      },
    });
    log.success(`验证码已创建: ${testCode}`);

    // 验证查询逻辑
    log.info('测试验证码查询...');
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: testEmail,
        token: testCode,
      },
      orderBy: {
        expires: 'desc',
      },
    });

    if (verificationRecord) {
      log.success('验证码查询成功');

      // 时间验证
      const serverNow = Date.now();
      const isValid = serverNow < verificationRecord.expires.getTime();
      log.info(`验证码状态: ${isValid ? '有效' : '已过期'}`);
    } else {
      log.error('验证码查询失败');
    }

    // 清理测试数据
    log.info('清理测试数据...');
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });

    log.success('测试完成');
    return true;
  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// 验证逻辑一致性
async function verify() {
  log.title('验证逻辑一致性');

  try {
    const nextAuthPath = path.join(
      __dirname,
      '../src/pages/api/auth/[...nextauth].ts',
    );
    const otpStatusPath = path.join(
      __dirname,
      '../src/pages/api/auth/otp-status.ts',
    );

    const nextAuthContent = fs.readFileSync(nextAuthPath, 'utf8');
    const otpStatusContent = fs.readFileSync(otpStatusPath, 'utf8');

    // 检查关键逻辑点
    const logicChecks = [
      { name: '频率限制判断', pattern: 'serverNow < rateLimitEndTime' },
      { name: '过期判断', pattern: 'serverNow >= strictExpireTime' },
      { name: '重发允许判断', pattern: 'serverNow >= resendAllowTime' },
      { name: '排序逻辑', pattern: "expires: 'desc'" },
    ];

    let allConsistent = true;

    for (const check of logicChecks) {
      const nextAuthHas = nextAuthContent.includes(check.pattern);
      const otpStatusHas = otpStatusContent.includes(check.pattern);

      if (nextAuthHas === otpStatusHas) {
        log.success(`${check.name}: 一致`);
      } else {
        log.error(`${check.name}: 不一致`);
        allConsistent = false;
      }
    }

    // 检查常量
    const constants = [
      'RATE_LIMIT_MS',
      'TOKEN_EXPIRE_MS',
      'RESEND_TOLERANCE_MS',
    ];

    for (const constant of constants) {
      const nextAuthHas = nextAuthContent.includes(constant);
      const otpStatusHas = otpStatusContent.includes(constant);

      if (nextAuthHas === otpStatusHas) {
        log.success(`${constant}: 一致`);
      } else {
        log.error(`${constant}: 不一致`);
        allConsistent = false;
      }
    }

    if (allConsistent) {
      log.success('所有逻辑检查通过');
    } else {
      log.error('发现逻辑不一致');
    }

    return allConsistent;
  } catch (error) {
    log.error(`验证失败: ${error.message}`);
    return false;
  }
}

// 完整检查
async function checkAll() {
  log.title('完整系统检查');

  const results = {
    diagnose: await diagnose(),
    verify: await verify(),
    test: await test(),
  };

  console.log('\n📋 检查结果汇总:');
  console.log(`诊断: ${results.diagnose ? '✅ 通过' : '❌ 失败'}`);
  console.log(`验证: ${results.verify ? '✅ 通过' : '❌ 失败'}`);
  console.log(`测试: ${results.test ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = Object.values(results).every((result) => result);

  if (allPassed) {
    log.success('所有检查都通过！验证码登录系统运行正常。');
  } else {
    log.error('部分检查失败，请查看上述详细信息。');
  }

  return allPassed;
}

// 显示帮助信息
function showHelp() {
  console.log(`
${colors.cyan}验证码登录系统工具集${colors.reset}

用法: node scripts/auth-tools.js [命令]

可用命令:
  diagnose    诊断系统配置和环境
  test        测试验证码登录流程
  verify      验证逻辑一致性
  check       运行完整检查
  help        显示此帮助信息

示例:
  node scripts/auth-tools.js diagnose
  node scripts/auth-tools.js check
  npm run auth:check
`);
}

// 主函数
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'diagnose':
      await diagnose();
      break;
    case 'test':
      await test();
      break;
    case 'verify':
      await verify();
      break;
    case 'check':
      await checkAll();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        log.error(`未知命令: ${command}`);
      }
      showHelp();
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    log.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { diagnose, test, verify, checkAll };
