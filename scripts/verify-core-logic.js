#!/usr/bin/env node

/**
 * 验证核心逻辑一致性（忽略格式差异）
 */

const fs = require('fs');
const path = require('path');

function extractLogicPoints(content) {
  const logicPoints = {};
  
  // 检查关键的时间判断逻辑
  logicPoints.hasRateLimitCheck = content.includes('serverNow < rateLimitEndTime');
  logicPoints.hasStrictExpireCheck = content.includes('serverNow >= strictExpireTime');
  logicPoints.hasResendAllowCheck = content.includes('serverNow >= resendAllowTime');
  
  // 检查返回值逻辑
  logicPoints.hasCanVerifyFalseOnExpire = content.includes('canVerify: false') && content.includes('过期');
  logicPoints.hasCanVerifyTrueOnValid = content.includes('canVerify: true');
  logicPoints.hasCanSendTrueOnValid = content.includes('canSend: true');
  
  // 检查时间常量使用
  logicPoints.usesRateLimit = content.includes('RATE_LIMIT_MS');
  logicPoints.usesResendTolerance = content.includes('RESEND_TOLERANCE_MS');
  
  // 检查查询排序
  logicPoints.hasOrderByExpires = content.includes("expires: 'desc'");
  
  return logicPoints;
}

async function verifyCoreLogic() {
  console.log('🔍 验证核心逻辑一致性（忽略格式差异）...\n');

  try {
    const nextAuthPath = path.join(__dirname, '../src/pages/api/auth/[...nextauth].ts');
    const otpStatusPath = path.join(__dirname, '../src/pages/api/auth/otp-status.ts');
    
    const nextAuthContent = fs.readFileSync(nextAuthPath, 'utf8');
    const otpStatusContent = fs.readFileSync(otpStatusPath, 'utf8');

    const nextAuthLogic = extractLogicPoints(nextAuthContent);
    const otpStatusLogic = extractLogicPoints(otpStatusContent);
    
    console.log('📋 核心逻辑点检查:');
    
    const logicKeys = Object.keys(nextAuthLogic);
    let allConsistent = true;
    
    for (const key of logicKeys) {
      const nextAuthHas = nextAuthLogic[key];
      const otpStatusHas = otpStatusLogic[key];
      
      if (nextAuthHas === otpStatusHas) {
        console.log(`✅ ${key}: 一致 (${nextAuthHas})`);
      } else {
        console.log(`❌ ${key}: NextAuth(${nextAuthHas}) vs OTP Status(${otpStatusHas})`);
        allConsistent = false;
      }
    }
    
    console.log('\n📋 时间判断边界检查:');
    
    // 检查关键的时间边界逻辑
    const timeChecks = [
      { name: '频率限制判断', pattern: 'serverNow < rateLimitEndTime' },
      { name: '过期判断', pattern: 'serverNow >= strictExpireTime' },
      { name: '重发允许判断', pattern: 'serverNow >= resendAllowTime' },
      { name: '验证时canVerify判断', pattern: 'canVerify: serverNow < strictExpireTime' }
    ];
    
    for (const check of timeChecks) {
      const nextAuthHas = nextAuthContent.includes(check.pattern);
      const otpStatusHas = otpStatusContent.includes(check.pattern);
      
      if (nextAuthHas === otpStatusHas) {
        console.log(`✅ ${check.name}: 一致 (${nextAuthHas})`);
      } else {
        console.log(`❌ ${check.name}: NextAuth(${nextAuthHas}) vs OTP Status(${otpStatusHas})`);
        allConsistent = false;
      }
    }
    
    console.log('\n📋 常量值检查:');
    
    // 提取常量值
    const extractConstant = (content, name) => {
      const match = content.match(new RegExp(`${name}\\s*=\\s*([^;]+)`));
      return match ? match[1].trim() : null;
    };
    
    const constants = ['RATE_LIMIT_MS', 'RESEND_TOLERANCE_MS'];
    
    for (const constant of constants) {
      const nextAuthValue = extractConstant(nextAuthContent, constant);
      const otpStatusValue = extractConstant(otpStatusContent, constant);
      
      if (nextAuthValue === otpStatusValue) {
        console.log(`✅ ${constant}: 一致 (${nextAuthValue})`);
      } else {
        console.log(`❌ ${constant}: NextAuth(${nextAuthValue}) vs OTP Status(${otpStatusValue})`);
        allConsistent = false;
      }
    }
    
    console.log('\n🎯 总结:');
    
    if (allConsistent) {
      console.log('✅ 核心逻辑完全一致');
      console.log('📝 两个文件的时间判断逻辑、边界条件和常量值都保持一致');
      console.log('🎉 验证码登录的逻辑在两个文件中是统一的');
    } else {
      console.log('❌ 发现逻辑不一致，需要修复');
      console.log('⚠️  请检查上述标记为❌的项目');
    }

  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyCoreLogic().catch(console.error);
}

module.exports = { verifyCoreLogic };
