**Verification code login system：原则 / 设计理念 / 模块划分**

## **一、设计原则（必须同时满足）**



1. **单一验证流程**：只用 NextAuth 的 CredentialsProvider('otp') 验码；发码用 EmailProvider；杜绝前端自建二次校验 → 彻底消灭双重验证竞态。

2. **严格验码，宽松发码**：

   - 验码：严格 0 容差（expires > now），命中即过。
   - 发码/UX：可以有「刚过期≤X秒免冷却重发」等「体验容差」，仅在发送/状态API中执行。

   

3. **时间一致性**：同一次请求只取一次 nowMs/nowDt（makeTimeCtx()），禁用散落 new Date()；前端依赖服务端 /api/auth/otp-status 的 sn/retry/exp。

4. **并发安全**：同一邮箱的并发发码/并发验码必须有数据库级保障（事务 + 串行化或时间桶锁 / advisory lock）；先插入后裁剪 ≤3。

5. **一次性消费**：采用“两阶段消费”。authorize() 仅预占用；events.signIn 登录真正成功后批量作废（deleteMany 本邮箱所有未过期验证码）。

6. **最小必要暴露**：对用户仅暴露精准状态与可操作引导，不泄露系统内部细节（是否存在账号、黑名单判定规则等）。

7. **迁移有序**：所有结构变更走 migrate dev/deploy；禁止随意 db pull/db push 覆盖生产。



## **二、设计理念（如何取舍）**



- **职责分离**：
  - 发码只关心「能不能发、怎么发、存什么」；
  - 验码只关心「这条是否有效」；
  - 状态API只关心「用户界面需要的三元状态」。
- **服务端裁决、前端展示**：所有时间/可操作性判断以服务端为准，前端只渲染。
- **安全优先，体验兜底**：验证码强随机（crypto.randomBytes）、速率限制与错误次数限制先保证安全，再通过状态API与文案优化体验。
- **并发先堵后疏**：源头抢占或串行化（时间桶/锁），落库后统一“裁剪到 3 条”。
- **失败可重试**：在“最终成功前不销毁资源”（两阶段消费），避免“正确验证码但无法重试”。

## **三、模块划分与职责**

### **后端（NextAuth + API）**

1. **EmailProvider（发码）**

   - 生成 6 位数字（CSPRNG）；写入 VerificationToken{identifier, token, expires[, createdAt]}。
   - 限流：依据“最近一次（不筛过期）”判断冷却；并发上限：统计 expires > now，**先插入后裁剪 ≤3**。
   - 并发控制（三选一或组合）：
     - 事务 Serializable + 冲突重试；
     - 时间桶抢占表（identifier + bucketStart 唯一）；
     - DB advisory lock（PG/MySQL）。

2. **CredentialsProvider(‘otp’)（验码）**

   - 严格查：identifier + token + expires > now；
   - 事务内完成：查→校验→用户查/建→封禁校验；**不删除验证码**（两阶段）。
   - 可选：实例内存预占用 Map+TTL 作为单实例幂等（多实例需DB锁）。

   

3. **events.signIn（最终消费）**

   - 登录成功后：deleteMany({ identifier, expires > now }) 批量作废；释放内存预占用。

4. **状态API /api/auth/otp-status**（前端唯一真相源）

   - 返回：sn（server now）、retry（冷却秒，基于“最近一次不筛过期”）、exp（最晚过期）、canVerify（是否有未过期）。

5. **日志与指标（可选配置，非必须）**

   - 关键字段：emailHash/nowMs/action/provider/result/retry/exp/error/ip/ua。
   - 指标：发码成功率、冷却命中率、验码通过率、错误分布、事件耗时、状态API失败率。

   

6. **数据迁移与一致性**

   - VerificationToken：identifier, token, expires（必有）；createdAt（推荐，排序/限流）；必要索引。
   - 选择其一：
     - 有 createdAt：用它做最近一次排序与限流；
     - 无 createdAt：以 expires - maxAge 反推创建时间（仅用于限流与显示），查询避免引用 createdAt。
   - 统一通过 migrate dev/deploy 管理。

### **前端（两个页面 + 状态驱动）**

1. **请求验证码页**

   - 表单提交 → signIn(‘email’)；成功后轮询/到点刷新 /otp-status。
   - 按钮可用性、倒计时均由 retry/exp 驱动；失败降级（请求失败不阻塞操作）。

2. **输入验证码页**

   - PinInput（type="tel", inputMode="numeric", manageFocus）；Enter 在**最后一格**触发提交；
   - 状态管理：isError, isSuccess, message（10s 自动隐藏提示，但输入红框直到用户改动）；
   - 错误上限（如 5 次）→ 冷静时间/回首页引导；
   - 成功后 router.push（避免完整刷新）；
   - 重发按钮受 retry 控制，并在点击后“操作后立即刷新”+“到点刷新”组合。

   

## **四、错误码与用户文案（统一映射）**

- 发码：RATE_LIMITED:<sec>, BLOCKED_EMAIL, EmailSignin（下游失败）。

- 验码：invalid_code, invalid_or_expired_code, user_blocked, verification_failed。

- 文案要点：

  

  - “任意一个有效验证码都可使用；登录成功后全部失效”；
  - 冷却提示显示精确秒数；
  - 失败后指引（等待、换邮箱、联系支持）。

  

## **五、验证策略（如何“验证所有功能”）**



### **单元测试（后端）**



- **发码限流**：最近一次 T=0s 发码 → 立即发第二次返回 RATE_LIMITED≈60；T=61s 允许。
- **并发发码**：并发 N=10，最终 count(expires > now) ≤ 3；若有时间桶/锁则只有一次“成功”。
- **验码严格**：expires == now 视为过期；只要 expires <= now 就 invalid_or_expired_code。
- **两阶段消费**：authorize 成功、events.signIn 前再次使用同码可成功；events.signIn 后使用失败。
- **状态API**：retry 来自最近一次（不筛过期）；exp 为最晚未过期；canVerify 与库一致。



### **集成/E2E（模拟浏览器）**

- 请求验证码 → 看到“60s 冷却倒计时”；到点后按钮自动可用；
- 快速连发 3 次 → 三封任意一条均可用；
- 输入错误 5 次 → 出现强制指引；
- 输入正确 → 进入主页；再使用旧码失败（批量作废生效）；
- 刷新页面/切换设备 → 状态一致（完全服务端驱动）。



### **竞态与异常测试**

- 并发两次验码（不同码）：一个成功，一个失败（预占用/锁生效）。
- events.signIn 人为抛错：验证码未作废，用户可重试登录；
- 邮件下游异常：发码逻辑不回滚插入，状态API能正确反映。



## **六、关键决策点（可配置）**

- maxAge（EmailProvider）：默认 600s；
- rateLimitMs：默认 60s；
- “体验容差”（用于发码/状态API，不用于验码）；
- 最多并发验证码数：默认 3；
- 错误尝试上限：默认 5；
- 并发控制策略：serializable+retry / 时间桶锁表 / advisory lock（PG/MySQL）/ Redis（可选）。

