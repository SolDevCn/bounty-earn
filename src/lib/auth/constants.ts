/**
 * 验证码系统统一时间配置（SSOT）
 * 验证裁决严格以 expires > now 为准；容差仅用于发送/展示体验。
 * 使用数据库原子预占用机制。
 */

// --- 常量（毫秒为主） ---
export const TOKEN_EXPIRE_MS = 10 * 60 * 1000; // 10 分钟
export const RATE_LIMIT_MS = 60 * 1000; // 60 秒
export const RESEND_TOLERANCE_MS = 30 * 1000; // 仅用于发送体验，不进入验证裁决
export const MAX_ACTIVE_TOKENS_PER_EMAIL = 3;

// --- 验证失败锁定配置 ---
export const MAX_VERIFICATION_ATTEMPTS = 5; // 最大验证尝试次数
export const VERIFICATION_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30分钟锁定时间

// --- 派生（秒） ---
export const TOKEN_EXPIRE_SEC = Math.floor(TOKEN_EXPIRE_MS / 1000);
export const RATE_LIMIT_SEC = Math.floor(RATE_LIMIT_MS / 1000);
export const VERIFICATION_BLOCK_DURATION_SEC = Math.floor(VERIFICATION_BLOCK_DURATION_MS / 1000);

// --- 错误码 ---
export const OTP_ERROR_CODES = Object.freeze({
  INVALID_CODE: 'invalid_code',
  INVALID_OR_EXPIRED_CODE: 'invalid_or_expired_code',
  EXPIRED_CODE: 'expired_code',
  CODE_ALREADY_USED: 'code_already_used',
  USER_BLOCKED: 'user_blocked',
  VERIFICATION_FAILED: 'verification_failed',
  INVALID_CREDENTIALS: 'invalid_credentials',
  BLOCKED_EMAIL: 'BLOCKED_EMAIL', // 若保留上游大写风格，请在前端做映射
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_TOKENS: 'TOO_MANY_TOKENS',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  VERIFICATION_BLOCKED: 'verification_blocked', // 验证失败次数过多被锁定
  TOO_MANY_ATTEMPTS: 'too_many_attempts', // 尝试次数过多
} as const);

export type OtpErrorCode =
  (typeof OTP_ERROR_CODES)[keyof typeof OTP_ERROR_CODES];

// --- 时间基准工具 ---
export const makeTimeCtx = () => {
  const nowMs = Date.now();
  return { nowMs, nowDt: new Date(nowMs) };
};

// --- 时间工具 ---
export const timeUtils = {
  now: () => Date.now(),
  nowDate: () => new Date(),
  getTokenExpireTime: (createdAt: number = Date.now()) =>
    new Date(createdAt + TOKEN_EXPIRE_MS),

  // 频率限制：上次创建时间 + 冷却窗 > now → 仍限流
  isWithinRateLimit: (lastCreatedAt: Date, now: number = Date.now()) =>
    now - lastCreatedAt.getTime() < RATE_LIMIT_MS,

  // 冷却剩余秒
  getRateLimitCooldown: (lastCreatedAt: Date, now: number = Date.now()) => {
    const remaining = RATE_LIMIT_MS - (now - lastCreatedAt.getTime());
    return Math.max(0, Math.ceil(remaining / 1000));
  },

  // 过期判断（与服务端裁决一致：有效条件为 expires > now）
  isTokenExpired: (expiresAt: Date, now: number = Date.now()) =>
    expiresAt.getTime() <= now,

  // 验证锁定相关工具
  isVerificationBlocked: (blockedUntil: Date | null, now: number = Date.now()) =>
    blockedUntil ? blockedUntil.getTime() > now : false,

  getVerificationBlockRemaining: (blockedUntil: Date | null, now: number = Date.now()) => {
    if (!blockedUntil) return 0;
    const remaining = blockedUntil.getTime() - now;
    return Math.max(0, Math.ceil(remaining / 1000));
  },

  getNewBlockedUntilTime: (now: number = Date.now()) =>
    new Date(now + VERIFICATION_BLOCK_DURATION_MS),
};
