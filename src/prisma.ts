/**
 * Prisma 客户端配置文件
 * 用于初始化数据库连接和查询客户端
 */

import { PrismaClient } from '@prisma/client';

/**
 * 创建并导出 Prisma 客户端实例
 * 配置选项：
 * - log: 可配置日志级别，包括 query（查询）、info（信息）、warn（警告）
 * 当前日志配置已注释，需要调试时可取消注释
 */
export const prisma = new PrismaClient({
  // log: ['query', 'info', 'warn'],
});
