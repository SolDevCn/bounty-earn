import type { NextApiResponse } from 'next';

import {
  type NextApiRequestWithUser,
  withAuth,
} from '@/features/auth';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

interface PermissionChangeResponse {
  hasChanges: boolean;
  lastModified?: string;
  changes?: {
    role?: string;
    sponsors?: Array<{
      id: string;
      role: string;
      action: 'added' | 'removed' | 'role_changed';
    }>;
  };
}

async function handler(req: NextApiRequestWithUser, res: NextApiResponse<PermissionChangeResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      hasChanges: false,
      error: 'Method not allowed' 
    } as any);
  }

  const userId = req.userId;
  const { since } = req.query;
  
  try {
    if (!since || isNaN(Number(since))) {
      return res.status(400).json({ 
        hasChanges: false,
        error: 'Invalid since parameter' 
      } as any);
    }

    const sinceDate = new Date(Number(since));
    
    // 获取用户当前信息和最后更新时间
    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      select: {
        id: true,
        role: true,
        updatedAt: true,
        currentSponsorId: true,
        UserSponsors: {
          select: {
            sponsorId: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            sponsor: {
              select: {
                id: true,
                isActive: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn(`User not found for permission change check: ${userId}`);
      return res.status(404).json({ 
        hasChanges: false,
        error: 'User not found' 
      } as any);
    }

    // 检查用户基本信息是否在指定时间后有更新
    const userHasChanges = user.updatedAt > sinceDate;
    
    // 检查用户关联的组织权限是否有变更
    const sponsorChanges = user.UserSponsors.some(
      (sponsorRelation) => 
        sponsorRelation.updatedAt > sinceDate || 
        sponsorRelation.createdAt > sinceDate
    );

    // 🎯 重点：检查sponsor激活状态是否有变更
    const sponsorActivationChanges = user.UserSponsors.some(
      (sponsorRelation) => 
        sponsorRelation.sponsor.updatedAt > sinceDate
    );

    const hasChanges = userHasChanges || sponsorChanges || sponsorActivationChanges;

    if (hasChanges) {
      logger.info(`Permission changes detected for user: ${userId}`, {
        userLastModified: user.updatedAt.toISOString(),
        sponsorChanges,
        sinceTime: sinceDate.toISOString(),
      });
    }

    const response: PermissionChangeResponse = {
      hasChanges,
      lastModified: user.updatedAt.toISOString(),
    };

    // 如果有变更，提供变更详情（可选）
    if (hasChanges && req.query.details === 'true') {
      response.changes = {
        role: user.role,
        sponsors: user.UserSponsors.map(sponsor => ({
          id: sponsor.sponsorId,
          role: sponsor.role,
          action: sponsor.createdAt > sinceDate ? 'added' : 'role_changed' as const,
        })),
      };
    }

    return res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Error checking permission changes for user ${userId}:`, error);
    return res.status(500).json({ 
      hasChanges: false,
      error: 'Internal server error' 
    } as any);
  }
}

export default withAuth(handler);