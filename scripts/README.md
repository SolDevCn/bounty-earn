# Scripts 工具集

本目录包含用于验证码登录系统的诊断、测试和部署工具。

## 🔧 核心工具

### 1. 统一工具集 `auth-tools.js`

集成了所有验证码登录相关的功能，提供统一的命令行界面。

```bash
# 使用 npm scripts（推荐）
npm run auth:diagnose    # 诊断系统
npm run auth:test        # 测试流程
npm run auth:verify      # 验证逻辑
npm run auth:check       # 完整检查

# 或直接调用
node scripts/auth-tools.js diagnose
node scripts/auth-tools.js test
node scripts/auth-tools.js verify
node scripts/auth-tools.js check
```

**功能模块：**

#### 📊 诊断模块 (`diagnose`)
- 检查必需的环境变量
- 验证数据库连接
- 查看验证码和用户统计
- 提供配置建议

#### 🧪 测试模块 (`test`)
- 创建测试验证码
- 模拟完整验证流程
- 测试数据库查询逻辑
- 自动清理测试数据

#### ✅ 验证模块 (`verify`)
- 检查 `[...nextauth].ts` 和 `otp-status.ts` 逻辑一致性
- 验证时间判断边界条件
- 确认常量值一致性
- 检查查询排序逻辑

#### 🔍 完整检查 (`check`)
- 运行所有上述模块
- 生成综合报告
- 提供修复建议

### 2. 部署前检查 `pre-deploy-check.js`

确保项目在部署前一切就绪。

```bash
npm run pre-deploy
```

**检查项目：**
- 项目配置文件完整性
- 环境变量设置
- TypeScript 类型检查
- ESLint 代码质量
- 验证码系统逻辑
- 项目构建测试

## 🚀 使用场景

### 开发调试
```bash
# 1. 检查环境配置
node scripts/diagnose-auth.js

# 2. 测试登录流程
node scripts/test-auth-flow.js

# 3. 验证逻辑一致性
node scripts/verify-core-logic.js
```

### 部署前检查
```bash
# 确保所有逻辑正确
node scripts/verify-core-logic.js
```

### 问题排查
```bash
# 当验证码登录出现问题时
node scripts/diagnose-auth.js
```

## 📝 注意事项

1. **环境要求**：需要正确配置 `.env` 文件
2. **数据库连接**：确保数据库可访问
3. **测试数据**：测试脚本会创建和清理测试数据
4. **权限**：确保脚本有执行权限

## 🔍 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查 DATABASE_URL 环境变量
   echo $DATABASE_URL
   
   # 重新生成 Prisma Client
   npx prisma generate
   ```

2. **环境变量缺失**
   ```bash
   # 检查 .env 文件
   cat .env | grep -E "(NEXTAUTH_SECRET|DATABASE_URL|RESEND_API_KEY)"
   ```

3. **权限问题**
   ```bash
   # 添加执行权限
   chmod +x scripts/*.js
   ```

## 🎯 最佳实践

1. **定期运行诊断**：在开发过程中定期运行诊断脚本
2. **CI/CD 集成**：可以将验证脚本集成到 CI/CD 流程中
3. **日志记录**：保存脚本输出用于问题追踪
4. **版本控制**：将重要的诊断脚本纳入版本控制

## 📚 相关文档

- [NextAuth.js 文档](https://next-auth.js.org/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [验证码登录实现说明](../docs/auth-implementation.md)
