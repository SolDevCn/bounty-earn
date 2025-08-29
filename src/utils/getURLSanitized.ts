export const getURLSanitized = (url: string) => {
  if (!url || url === '-' || url === '#') return '#';

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '#';

  // 1) 站内相对路径：保持相对，不做 scheme 拼接
  if (
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('./') ||
    trimmedUrl.startsWith('../')
  ) {
    return trimmedUrl;
  }

  // 2) 危险协议：一律屏蔽
  const lower = trimmedUrl.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return '#';
  }

  // 3) 合法白名单协议：直接放行
  const allowed = ['http://', 'https://', 'mailto:', 'tel:', 'sms:'];
  if (allowed.some((p) => lower.startsWith(p))) {
    return trimmedUrl;
  }

  // 4) 邮箱（更稳妥可换 regex）
  const isEmail = trimmedUrl.includes('@') && !trimmedUrl.includes('://');
  if (isEmail) {
    return `mailto:${trimmedUrl}`;
  }

  // 5) Twitter/X 链接规范化
  const isTwitterLink =
    lower.includes('twitter.com') ||
    lower.includes('x.com') ||
    (trimmedUrl.startsWith('@') && !trimmedUrl.includes('/'));

  if (isTwitterLink) {
    return getTwitterUrl(trimmedUrl);
  }

  // 6) 裸域名 / 以 www. 开头：补 https
  if (trimmedUrl.startsWith('www.')) {
    return `https://${trimmedUrl}`;
  }
  // 也可做更严格的域名判定，这里按你们的做法默认补 https
  return `https://${trimmedUrl}`;
};
/**
 * 规范化 Twitter/X 链接或用户名到标准 URL。
 * - 输入可为：@user | user | twitter.com/user | x.com/user | http(s)://... | mobile.twitter.com/...
 * - 自动清理并统一到首选域名（默认 x.com，可配置为 twitter.com）
 */
export function getTwitterUrl(
  raw: string,
  opts: { preferXDomain?: boolean } = { preferXDomain: true },
): string {
  const preferX = Boolean(opts.preferXDomain);
  const base = preferX ? 'https://x.com' : 'https://twitter.com';

  if (!raw) return base;
  const input = raw.trim();

  // 防危险协议
  const lower = input.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return base;
  }

  // 已是 http(s) 完整链接
  if (/^https?:\/\//i.test(input)) {
    try {
      const u = new URL(input);
      const host = u.hostname.toLowerCase();
      const isTwitterHost =
        host === 'x.com' ||
        host === 'www.x.com' ||
        host === 'twitter.com' ||
        host === 'www.twitter.com' ||
        host === 'mobile.twitter.com';

      if (isTwitterHost) {
        u.hostname = preferX ? 'x.com' : 'twitter.com';
        return u.toString();
      }
      // 非 Twitter/X 的链接就原样返回
      return input;
    } catch {
      // 解析失败，走下面兜底
    }
  }

  // 形如：x.com/... | twitter.com/... | www.twitter.com/... | mobile.twitter.com/...
  if (
    /^(www\.)?(twitter\.com|x\.com)\//i.test(input) ||
    /^mobile\.twitter\.com\//i.test(input)
  ) {
    const path = input.replace(
      /^(www\.)?|(twitter\.com|x\.com|mobile\.twitter\.com)\//gi,
      '',
    );
    return `${base}/${path}`;
  }

  // 去掉 @ 前缀
  const noAt = input.startsWith('@') ? input.slice(1) : input;

  // 若仍包含 twitter.com/x.com 片段，取最后一段
  if (/twitter\.com\/|x\.com\//i.test(noAt)) {
    const parts = noAt.split(/twitter\.com\/|x\.com\//i);
    return `${base}/${parts[parts.length - 1]}`;
  }

  // 用户名或路径（含 status/123, lists/... 等）
  const clean = noAt.replace(/\s+/g, '');
  if (!clean) return base;
  return `${base}/${clean}`;
}
