import type { NextApiResponse } from 'next';

import {
  type NextApiRequestWithSponsor,
  withSponsorAuth,
} from '@/features/auth';
import { createPermissionChecker } from '@/features/auth/utils/unifiedPermissions';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';
import { safeStringify } from '@/utils/safeStringify';
import { triggerPermissionChange } from '@/lib/permissionEvents';

interface UpdateSponsorMemberRoleRequest {
  memberId: string; // 要修改的成员user ID
  newRole: 'ADMIN' | 'MEMBER';
  sponsorId?: string; // 可选，如果不提供则使用当前用户的currentSponsorId
  reason?: string;
}

interface UpdateSponsorMemberRoleResponse {
  success: boolean;
  message: string;
  updatedMember?: {
    userId: string;
    sponsorId: string;
    role: string;
    updatedAt: string;
  };
}

async function handler(
  req: NextApiRequestWithSponsor,
  res: NextApiResponse<UpdateSponsorMemberRoleResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const adminUserId = req.userId;
  const { memberId, newRole, sponsorId, reason }: UpdateSponsorMemberRoleRequest = req.body;

  logger.debug(`Sponsor member role update request: ${safeStringify(req.body)}`);

  try {
    // 验证请求参数
    if (!memberId || !newRole) {
      return res.status(400).json({
        success: false,
        message: 'memberId and newRole are required',
      });
    }

    if (!['ADMIN', 'MEMBER'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'newRole must be ADMIN or MEMBER',
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

      // 确定目标组织ID
      const targetSponsorId = sponsorId || adminUser.currentSponsorId;
      if (!targetSponsorId) {
        throw new Error('Sponsor ID is required');
      }

      // 权限检查
      const adminPermissions = createPermissionChecker(adminUser as any);
      if (!adminPermissions.canManageTeamInSponsor(targetSponsorId)) {
        throw new Error('Insufficient permissions to manage team members in this organization');
      }

      // 获取目标成员信息
      const targetMember = await tx.userSponsors.findUnique({
        where: {
          userId_sponsorId: {
            userId: memberId,
            sponsorId: targetSponsorId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new Error('Target member not found in the specified organization');
      }

      // 防止修改自己的角色（除非是GOD用户）
      if (adminUser.id === memberId && !adminPermissions.isGod()) {
        throw new Error('Cannot modify your own role unless you are a GOD user');
      }

      // 记录当前角色
      const oldRole = targetMember.role;

      // 如果角色没有变化，直接返回
      if (oldRole === newRole) {
        return {
          member: targetMember,
          unchanged: true,
        };
      }

      // 执行角色更新
      const updatedMember = await tx.userSponsors.update({
        where: {
          userId_sponsorId: {
            userId: memberId,
            sponsorId: targetSponsorId,
          },
        },
        data: { 
          role: newRole as 'ADMIN' | 'MEMBER',
          updatedAt: new Date(), // 显式更新时间，确保权限检查能够检测到变更
        },
        select: {
          userId: true,
          sponsorId: true,
          role: true,
          updatedAt: true,
        },
      });

      // 记录角色变更日志
      logger.info(`Sponsor member role updated successfully`, {
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        targetUserId: memberId,
        targetEmail: targetMember.user.email,
        sponsorId: targetSponsorId,
        oldRole,
        newRole,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      });

      // 触发权限变更事件
      await triggerPermissionChange(memberId, {
        type: 'SPONSOR_ROLE_CHANGED',
        details: {
          oldRole,
          newRole,
          sponsorId: targetSponsorId,
          adminUserId: adminUser.id,
          reason: reason || 'No reason provided',
        },
      });

      return {
        member: updatedMember,
        unchanged: false,
      };
    });

    if (result.unchanged) {
      return res.status(200).json({
        success: true,
        message: 'Member role is already set to the requested value',
        updatedMember: {
          userId: result.member.userId,
          sponsorId: result.member.sponsorId,
          role: result.member.role,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Member role successfully updated to ${newRole}`,
      updatedMember: {
        userId: result.member.userId,
        sponsorId: result.member.sponsorId,
        role: result.member.role,
        updatedAt: result.member.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Failed to update sponsor member role:`, {
      adminUserId,
      targetMemberId: memberId,
      sponsorId: sponsorId || 'current',
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

    if (error.message.includes('permissions') || error.message.includes('Cannot modify')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating member role',
    });
  }
}

export default withSponsorAuth(handler);