import logger from './logger';
import { prisma } from '@/prisma';

export interface PermissionChangeEvent {
  type: 'ROLE_CHANGED' | 'SPONSOR_ROLE_CHANGED' | 'SPONSOR_ADDED' | 'SPONSOR_REMOVED';
  userId: string;
  timestamp: Date;
  details: {
    oldRole?: string;
    newRole?: string;
    sponsorId?: string;
    adminUserId?: string;
    reason?: string;
  };
}

/**
 * 触发权限变更事件
 * 目前实现为日志记录，后续可扩展为事件队列、WebSocket推送等
 */
export const triggerPermissionChange = async (
  userId: string,
  event: Omit<PermissionChangeEvent, 'userId' | 'timestamp'>
): Promise<void> => {
  const fullEvent: PermissionChangeEvent = {
    ...event,
    userId,
    timestamp: new Date(),
  };

  try {
    // 记录权限变更事件日志
    logger.info('Permission change event triggered', {
      eventType: fullEvent.type,
      userId: fullEvent.userId,
      details: fullEvent.details,
      timestamp: fullEvent.timestamp.toISOString(),
    });

    // TODO: 后续可以在这里添加更多事件处理逻辑
    // - 发送到事件队列
    // - WebSocket实时推送
    // - 邮件通知
    // - 审计日志存储
    
    // 示例：存储事件到数据库（可选）
    // await storePermissionChangeEvent(fullEvent);
    
  } catch (error) {
    logger.error('Failed to process permission change event', {
      event: fullEvent,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * 批量触发权限变更事件
 */
export const triggerBatchPermissionChanges = async (
  events: Array<{
    userId: string;
    event: Omit<PermissionChangeEvent, 'userId' | 'timestamp'>;
  }>
): Promise<void> => {
  const promises = events.map(({ userId, event }) => 
    triggerPermissionChange(userId, event)
  );
  
  await Promise.allSettled(promises);
};

/**
 * 获取用户最近的权限变更时间（用于同步检查）
 * 这个函数检查用户及其相关数据的最后更新时间
 */
export const getUserLastPermissionChangeTime = async (userId: string): Promise<Date | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        updatedAt: true,
        UserSponsors: {
          select: {
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return null;
    }

    // 比较用户更新时间和最新的组织关系更新时间
    const userUpdatedAt = user.updatedAt;
    const latestSponsorUpdate = user.UserSponsors[0]?.updatedAt;

    if (!latestSponsorUpdate) {
      return userUpdatedAt;
    }

    return userUpdatedAt > latestSponsorUpdate ? userUpdatedAt : latestSponsorUpdate;
  } catch (error) {
    logger.error('Failed to get user last permission change time', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * 检查多个用户是否有权限变更（批量检查）
 */
export const checkBatchPermissionChanges = async (
  requests: Array<{
    userId: string;
    since: Date;
  }>
): Promise<Array<{
  userId: string;
  hasChanges: boolean;
  lastModified?: Date;
}>> => {
  const results = await Promise.allSettled(
    requests.map(async ({ userId, since }) => {
      const lastChangeTime = await getUserLastPermissionChangeTime(userId);
      return {
        userId,
        hasChanges: lastChangeTime ? lastChangeTime > since : false,
        lastModified: lastChangeTime || undefined,
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('Failed to check permission changes for user', {
        userId: requests[index].userId,
        error: result.reason,
      });
      return {
        userId: requests[index].userId,
        hasChanges: false,
      };
    }
  });
};