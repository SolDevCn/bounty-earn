# 本地开发脚本说明

本文档说明了哪些脚本仅用于本地开发，已被添加到 `.gitignore` 中。

## 🚫 不推送到主分支的脚本

以下脚本已被添加到项目根目录的 `.gitignore` 文件中，仅用于本地开发：

### 数据库相关脚本
- `add-createdAt-simple.js` - 为 VerificationToken 表添加 createdAt 字段
- `add-createdAt-field.js` - 安全的数据库结构同步脚本
- `check-db-schema.js` - 检查数据库表结构
- `check-db-status.js` - 检查数据库状态和数据完整性

### 兼容性和调试脚本
- `auth-tools-compatible.js` - 兼容版本的验证码工具（适配缺少 createdAt 字段）
- `auth-tools-sql.js` - 使用原生 SQL 的验证码工具
- `detailed-function-compare.js` - 详细比较两个文件中的函数差异

### 临时验证脚本
- `verify-logic-consistency.js` - 验证逻辑一致性（功能与 verify-core-logic.js 重复）
- `verify-10min-expiry.js` - 验证10分钟有效期逻辑

### 配置文件
- `.gitignore-suggestions` - gitignore 建议文件

## ✅ 推送到主分支的脚本

以下脚本对团队开发有价值，会被推送到主分支：

### 核心工具
- `auth-tools.js` - 统一的验证码登录工具集
- `diagnose-auth.js` - 验证码登录问题诊断
- `test-auth-flow.js` - 验证码登录流程测试
- `verify-core-logic.js` - 核心逻辑一致性验证
- `pre-deploy-check.js` - 部署前检查

### 文档
- `README.md` - 脚本工具集说明文档
- `LOCAL-SCRIPTS.md` - 本文档

## 🔧 如何使用

### 本地开发时
```bash
# 这些脚本在本地可以正常使用
node scripts/check-db-status.js
node scripts/add-createdAt-simple.js

# 但不会被 git 跟踪
git status  # 不会显示这些文件的修改
```

### 团队协作时
```bash
# 团队成员可以使用核心工具
npm run auth:check
npm run auth:diagnose
npm run pre-deploy
```

## 📝 注意事项

1. **本地脚本的作用**：这些脚本主要用于调试、数据库修复和临时验证
2. **不影响团队**：其他团队成员不会看到这些临时脚本
3. **保持整洁**：主分支只包含对团队有价值的核心工具
4. **灵活开发**：可以在本地自由创建和修改测试脚本

## 🚀 如果需要共享某个脚本

如果某个本地脚本被证明对团队有价值，可以：

1. 从 `.gitignore` 中移除该脚本
2. 添加到 `README.md` 的文档中
3. 提交到主分支供团队使用

```bash
# 例如，如果要共享 check-db-status.js
# 1. 编辑 .gitignore，移除该行
# 2. 添加到 git
git add scripts/check-db-status.js
git commit -m "Add database status check script for team use"
```
