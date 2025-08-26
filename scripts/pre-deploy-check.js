#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 确保验证码登录系统在部署前一切正常
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.cyan}🚀 ${msg}${colors.reset}\n`),
};

// 检查项目配置
function checkProjectConfig() {
  log.info('检查项目配置...');
  
  const checks = [
    {
      name: 'package.json 存在',
      check: () => fs.existsSync('package.json'),
    },
    {
      name: '.env 文件存在',
      check: () => fs.existsSync('.env'),
    },
    {
      name: 'prisma schema 存在',
      check: () => fs.existsSync('prisma/schema.prisma'),
    },
    {
      name: 'NextAuth 配置存在',
      check: () => fs.existsSync('src/pages/api/auth/[...nextauth].ts'),
    },
    {
      name: 'OTP 状态 API 存在',
      check: () => fs.existsSync('src/pages/api/auth/otp-status.ts'),
    },
  ];

  let allPassed = true;
  
  for (const check of checks) {
    if (check.check()) {
      log.success(check.name);
    } else {
      log.error(check.name);
      allPassed = false;
    }
  }

  return allPassed;
}

// 运行类型检查
function runTypeCheck() {
  log.info('运行 TypeScript 类型检查...');
  
  try {
    execSync('npm run check-types', { stdio: 'pipe' });
    log.success('TypeScript 类型检查通过');
    return true;
  } catch (error) {
    log.error('TypeScript 类型检查失败');
    console.log(error.stdout?.toString());
    return false;
  }
}

// 运行 ESLint 检查
function runLintCheck() {
  log.info('运行 ESLint 检查...');
  
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    log.success('ESLint 检查通过');
    return true;
  } catch (error) {
    log.warning('ESLint 检查发现问题（可能不影响部署）');
    return true; // ESLint 问题不阻止部署
  }
}

// 运行验证码系统检查
function runAuthCheck() {
  log.info('运行验证码系统检查...');
  
  try {
    execSync('node scripts/auth-tools.js verify', { stdio: 'pipe' });
    log.success('验证码系统逻辑检查通过');
    return true;
  } catch (error) {
    log.error('验证码系统检查失败');
    return false;
  }
}

// 检查环境变量
function checkEnvironmentVariables() {
  log.info('检查关键环境变量...');
  
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'RESEND_API_KEY',
  ];

  let allSet = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log.success(`${varName} 已设置`);
    } else {
      log.error(`${varName} 未设置`);
      allSet = false;
    }
  }

  return allSet;
}

// 尝试构建项目
function tryBuild() {
  log.info('尝试构建项目...');
  
  try {
    execSync('npm run build', { stdio: 'pipe' });
    log.success('项目构建成功');
    return true;
  } catch (error) {
    log.error('项目构建失败');
    console.log(error.stdout?.toString());
    return false;
  }
}

// 主检查函数
async function preDeployCheck() {
  log.title('部署前检查');
  
  const checks = [
    { name: '项目配置', fn: checkProjectConfig },
    { name: '环境变量', fn: checkEnvironmentVariables },
    { name: 'TypeScript', fn: runTypeCheck },
    { name: 'ESLint', fn: runLintCheck },
    { name: '验证码系统', fn: runAuthCheck },
    { name: '项目构建', fn: tryBuild },
  ];

  const results = {};
  
  for (const check of checks) {
    console.log(`\n📋 ${check.name}检查:`);
    results[check.name] = check.fn();
  }

  // 汇总结果
  console.log('\n📊 检查结果汇总:');
  let allPassed = true;
  
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? '通过' : '失败'}`);
    if (!passed) allPassed = false;
  }

  console.log('\n🎯 部署建议:');
  
  if (allPassed) {
    log.success('所有检查都通过！项目可以安全部署。');
    console.log(`
${colors.green}✨ 部署清单:${colors.reset}
1. 确保生产环境变量正确配置
2. 数据库迁移已应用
3. 域名和 NEXTAUTH_URL 配置正确
4. 邮件服务配置正确
5. 监控和日志系统就绪
`);
  } else {
    log.error('部分检查失败，建议修复后再部署。');
    console.log(`
${colors.yellow}⚠️ 修复建议:${colors.reset}
1. 检查失败的项目并修复
2. 确保所有环境变量正确设置
3. 解决 TypeScript 类型错误
4. 修复验证码系统逻辑问题
5. 确保项目可以正常构建
`);
  }

  return allPassed;
}

// 如果直接运行此脚本
if (require.main === module) {
  preDeployCheck().catch(error => {
    log.error(`检查失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { preDeployCheck };
