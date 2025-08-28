export const getURLSanitized = (url: string) => {
  if (!url || url === '-' || url === '#') return url;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return url;

  // 如果是相对路径，直接返回
  if (
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('./') ||
    trimmedUrl.startsWith('../')
  ) {
    return trimmedUrl;
  }

  // 如果已经有协议（包括特殊协议），直接返回
  if (trimmedUrl.includes('://') || trimmedUrl.includes(':')) {
    // 检查是否是特殊协议
    const specialProtocols = [
      'mailto:',
      'tel:',
      'sms:',
      'data:',
      'javascript:',
    ];
    if (specialProtocols.some((protocol) => trimmedUrl.startsWith(protocol))) {
      return trimmedUrl;
    }
    // 如果包含://，说明已经是完整URL
    if (trimmedUrl.includes('://')) {
      return trimmedUrl;
    }
  }

  const isEmail =
    trimmedUrl.includes('@') &&
    !trimmedUrl.includes('://') &&
    !trimmedUrl.startsWith('mailto:');

  if (isEmail) {
    return `mailto:${trimmedUrl}`;
  }

  // 如果不是以www.开头且不包含协议，添加https://
  if (!trimmedUrl.startsWith('www.')) {
    return `https://${trimmedUrl}`;
  }

  return `https://${trimmedUrl}`;
};

export const getTwitterUrl = (raw: string) => {
  const trimmed = raw.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('twitter.com/')) {
      return trimmed;
    }
  }

  if (
    trimmed.startsWith('www.twitter.com/') ||
    trimmed.startsWith('twitter.com/')
  ) {
    return 'https://' + trimmed;
  }

  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  if (username.includes('twitter.com/')) {
    const parts = username.split('twitter.com/');
    return `https://twitter.com/${parts[parts.length - 1]}`;
  }

  return `https://twitter.com/${username}`;
};
