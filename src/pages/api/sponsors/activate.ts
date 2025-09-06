import type { NextApiResponse } from 'next';

import { withAuth, type AuthenticatedRequest } from '@/features/auth';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';
import { triggerBatchPermissionChanges } from '@/lib/permissionEvents';

async function activateSponsor(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  // 🎯 内联God权限检查
  if (req.user.role !== 'GOD') {
    return res.status(403).json({ 
      error: 'Forbidden: God权限 required for sponsor activation' 
    });
  }
  try {
    const { sponsorId } = req.body;

    if (!sponsorId) {
      logger.warn('Invalid sponsor ID');
      return res.status(400).json({ error: 'Invalid sponsor ID' });
    }

    // 🎯 使用事务确保sponsor激活和权限事件触发的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取sponsor当前状态
      const existingSponsor = await tx.sponsors.findUnique({
        where: { id: sponsorId },
        select: { 
          id: true, 
          name: true, 
          isActive: true,
        },
      });

      if (!existingSponsor) {
        throw new Error('Sponsor not found');
      }

      // 如果sponsor已经是激活状态，直接返回
      if (existingSponsor.isActive) {
        logger.info(`Sponsor already active: ${sponsorId}`);
        return {
          sponsor: existingSponsor,
          wasAlreadyActive: true,
          affectedUsers: [],
        };
      }

      // 2. 激活sponsor
      const updatedSponsor = await tx.sponsors.update({
        where: { id: sponsorId },
        data: { isActive: true },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

      // 3. 获取该sponsor下的所有用户（Admin和Member）
      const affectedUsers = await tx.userSponsors.findMany({
        where: { sponsorId },
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`God activated sponsor successfully`, {
        sponsorId,
        sponsorName: updatedSponsor.name,
        godUserId: req.user.id,
        affectedUsersCount: affectedUsers.length,
        affectedUsers: affectedUsers.map(u => ({
          userId: u.userId,
          email: u.user.email,
          role: u.role,
        })),
      });

      return {
        sponsor: updatedSponsor,
        wasAlreadyActive: false,
        affectedUsers,
      };
    });

    // 4. 如果有用户受到影响，触发批量权限变更事件
    if (!result.wasAlreadyActive && result.affectedUsers.length > 0) {
      const permissionEvents = result.affectedUsers.map(user => ({
        userId: user.userId,
        event: {
          type: 'SPONSOR_ADDED' as const,
          details: {
            sponsorId,
            newRole: user.role,
            adminUserId: req.user.id,
            reason: `Sponsor "${result.sponsor.name}" activated by God user`,
          },
        },
      }));

      // 异步触发权限变更事件（不阻塞响应）
      triggerBatchPermissionChanges(permissionEvents).catch(error => {
        logger.error('Failed to trigger permission change events after sponsor activation', {
          sponsorId,
          affectedUsersCount: result.affectedUsers.length,
          error: error.message,
        });
      });

      logger.info(`Triggered permission changes for ${result.affectedUsers.length} users after sponsor activation`, {
        sponsorId,
        sponsorName: result.sponsor.name,
      });
    }

    return res.status(200).json({
      ...result.sponsor,
      message: result.wasAlreadyActive 
        ? 'Sponsor was already active' 
        : `Sponsor activated successfully. ${result.affectedUsers.length} users will be notified of permission changes.`,
      affectedUsersCount: result.affectedUsers.length,
    });
  } catch (error: any) {
    logger.error(`Error occurred while activating sponsor: ${error.message}`);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      message: 'Error occurred while activating sponsor.',
    });
  }
}

export default withAuth(activateSponsor);
