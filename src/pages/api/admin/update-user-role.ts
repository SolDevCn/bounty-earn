import type { NextApiResponse } from 'next';

import {
  type NextApiRequestWithUser,
  withAuth,
} from '@/features/auth';
import { createPermissionChecker } from '@/features/auth/utils/unifiedPermissions';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';
import { safeStringify } from '@/utils/safeStringify';
import { triggerPermissionChange } from '@/lib/permissionEvents';

interface UpdateUserRoleRequest {
  userId: string;
  newRole: 'GOD' | 'USER';
  reason?: string;
}

interface UpdateUserRoleResponse {
  success: boolean;
  message: string;
  updatedUser?: {
    id: string;
    email: string;
    role: string;
    updatedAt: string;
  };
}

async function handler(
  req: NextApiRequestWithUser,
  res: NextApiResponse<UpdateUserRoleResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const adminUserId = req.userId;
  const { userId, newRole, reason }: UpdateUserRoleRequest = req.body;

  logger.debug(`Admin role update request: ${safeStringify(req.body)}`);

  try {
    // 验证请求参数
    if (!userId || !newRole) {
      return res.status(400).json({
        success: false,
        message: 'userId and newRole are required',
      });
    }

    if (!['GOD', 'USER'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'newRole must be GOD or USER',
      });
    }

    // 使用事务确保操作的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 获取执行操作的管理员信息
      const adminUser = await tx.user.findUnique({
        where: { id: adminUserId as string },
        select: {
          id: true,
          email: true,
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

      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // 权限检查 - 只有GOD用户可以修改其他用户的角色
      const adminPermissions = createPermissionChecker(adminUser as any);
      if (!adminPermissions.isGod()) {
        throw new Error('Only GOD users can update user roles');
      }

      // 获取目标用户信息
      const targetUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          currentSponsorId: true,
        },
      });

      if (!targetUser) {
        throw new Error('Target user not found');
      }

      // 防止修改自己的角色
      if (adminUser.id === targetUser.id) {
        throw new Error('Cannot modify your own role');
      }

      // 记录当前角色
      const oldRole = targetUser.role;

      // 如果角色没有变化，直接返回
      if (oldRole === newRole) {
        return {
          user: targetUser,
          unchanged: true,
        };
      }

      // 执行角色更新
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          role: newRole,
          updatedAt: new Date(), // 显式更新时间，确保权限检查能够检测到变更
        },
        select: {
          id: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });

      // 记录角色变更日志
      logger.info(`User role updated successfully`, {
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        targetUserId: userId,
        targetEmail: targetUser.email,
        oldRole,
        newRole,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      });

      // 触发权限变更事件
      await triggerPermissionChange(userId, {
        type: 'ROLE_CHANGED',
        details: {
          oldRole,
          newRole,
          adminUserId: adminUser.id,
          reason: reason || 'No reason provided',
        },
      });

      return {
        user: updatedUser,
        unchanged: false,
      };
    });

    if (result.unchanged) {
      return res.status(200).json({
        success: true,
        message: 'User role is already set to the requested value',
        updatedUser: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to ${newRole}`,
      updatedUser: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        updatedAt: 'updatedAt' in result.user ? result.user.updatedAt.toISOString() : new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Failed to update user role:`, {
      adminUserId,
      targetUserId: userId,
      newRole,
      error: error.message,
      stack: error.stack,
    });

    // 根据错误类型返回适当的状态码
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('Only GOD users') || error.message.includes('Cannot modify')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating user role',
    });
  }
}

export default withAuth(handler);