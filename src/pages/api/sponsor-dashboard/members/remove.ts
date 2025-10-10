import type { NextApiResponse } from 'next';

import {
  type NextApiRequestWithSponsor,
  withSponsorAuth,
} from '@/features/auth';
import { createPermissionChecker } from '@/features/auth/utils/unifiedPermissions';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';
import { safeStringify } from '@/utils/safeStringify';

async function removeMember(
  req: NextApiRequestWithSponsor,
  res: NextApiResponse,
) {
  const { id } = req.body;
  const userId = req.userId;
  const userSponsorId = req.userSponsorId;

  if (!userSponsorId) {
    logger.warn('Invalid token: User Sponsor Id is missing');
    return res.status(400).json({ error: 'Invalid token' });
  }

  logger.debug(`Request body: ${safeStringify(req.body)}`);

  try {
    // 🎯 使用事务确保权限验证和操作的原子性
    await prisma.$transaction(async (tx) => {
      // 在事务内获取最新的用户权限信息
      const user = await tx.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          role: true,
          currentSponsorId: true,
          UserSponsors: {
            select: {
              sponsorId: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 权限检查 - 相信withSponsorAuth的GOD绕过机制
      const permissions = createPermissionChecker(user);
      permissions.assertCanManageTeam();

      // 检查要删除的成员是否存在
      const memberToRemove = await tx.userSponsors.findUnique({
        where: {
          userId_sponsorId: {
            userId: id,
            sponsorId: user.currentSponsorId!,
          },
        },
      });

      if (!memberToRemove) {
        throw new Error('Member not found');
      }

      // 执行删除操作
      await tx.userSponsors.delete({
        where: {
          userId_sponsorId: {
            userId: id,
            sponsorId: user.currentSponsorId!,
          },
        },
      });

      // 如果该用户的当前sponsor就是被删除的sponsor，清空currentSponsorId
      await tx.user.updateMany({
        where: {
          id,
          currentSponsorId: user.currentSponsorId,
        },
        data: {
          currentSponsorId: null,
        },
      });
    });

    logger.info(`Successfully removed member with ID: ${id}`);
    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error: any) {
    logger.error(`Error removing member: ${error.message}`);
    
    if (error.message.includes('permissions') || error.message.includes('not found')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSponsorAuth(removeMember);
