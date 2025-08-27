import { Logger } from 'tslog';

const logger = new Logger({
  minLevel: process.env.VERCEL_ENV === 'production' ? 2 : 9999999,
  prettyLogTimeZone: 'UTC',
  prettyErrorStackTemplate:
    '  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}',
  prettyErrorTemplate:
    '\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}',
  prettyLogTemplate: '{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}',
  stylePrettyLogs: true,
  prettyLogStyles: {
    logLevelName: {
      '*': ['bold', 'black', 'bgWhiteBright', 'dim'],
      SILLY: ['bold', 'white'],
      TRACE: ['bold', 'blue'],
      DEBUG: ['bold', 'cyan'],
      INFO: ['bold', 'green'],
      WARN: ['bold', 'yellow'],
      ERROR: ['bold', 'red'],
      FATAL: ['bold', 'magenta'],
    },
    dateIsoStr: 'blue',
    filePathWithLine: 'magenta',
  },
});

// Security utility to mask sensitive data in logs
export const maskSensitiveData = {
  // Mask verification codes/tokens - shows first 2 characters
  code: (code: string | null | undefined): string => {
    if (!code) return 'null';
    return code.length >= 2 ? `${code.substring(0,2)}****` : '****';
  },
  
  // Mask email - shows first part and domain
  email: (email: string | null | undefined): string => {
    if (!email) return 'null';
    const [localPart, domain] = email.split('@');
    if (!domain) return '****@****';
    return `${localPart.substring(0,2)}****@${domain}`;
  },
  
  // Mask any token/sensitive string
  token: (token: string | null | undefined): string => {
    if (!token) return 'null';
    return token.length >= 4 ? `${token.substring(0,2)}***${token.slice(-1)}` : '****';
  }
};

export default logger;
