const fetchAsset = (url: URL) => fetch(url).then((res) => res.arrayBuffer());

// 将相对路径转换为绝对URL（用于Edge运行时）
const getAbsoluteUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://earn.superteam.fun'; // 生产环境域名

  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};

const formatString = (str: string, maxLength: number) =>
  str?.length > maxLength ? `${str.slice(0, maxLength)}...` : str;

const formatNumber = (num: string) => {
  const number = Number(num);

  if (isNaN(number)) {
    return '0';
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}m`;
  } else if (number >= 10000) {
    return `${(number / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}k`;
  } else {
    return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
};

export { fetchAsset, formatNumber, formatString, getAbsoluteUrl };
