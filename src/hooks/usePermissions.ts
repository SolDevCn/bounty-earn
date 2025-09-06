import { useMemo } from 'react';
import { useUser } from '@/store/user';
import { createPermissionChecker, type UserWithPermissions } from '@/features/auth/utils/unifiedPermissions';
import { usePermissionSync } from './usePermissionSync';

/**
 * 统一的权限管理Hook
 * 基于用户的角色和sponsor关系提供权限检查功能
 * 自动同步权限变更，确保权限状态实时性
 */
export const usePermissions = () => {
  const { user } = useUser();
  
  // 启用权限自动同步，每30秒检查一次权限变更
  const { isChecking, forceCheck } = usePermissionSync({
    interval: 30000,
    enabled: true,
    showNotification: true,
  });

  const permissions = useMemo(() => {
    if (!user) {
      return {
        isGod: false,
        canManageTeam: false,
        canAccessDashboard: false,
        canManageListings: false,
        currentSponsorRole: null as 'ADMIN' | 'MEMBER' | null,
        currentSponsorId: null as string | null,
        allSponsorRoles: [] as Array<{ sponsorId: string; role: 'ADMIN' | 'MEMBER' }>,
        checker: null,
      };
    }

    // 创建权限检查器
    const checker = createPermissionChecker(user as UserWithPermissions);
    const summary = checker.getPermissionSummary();
    
    return {
      isGod: summary.isGod,
      canManageTeam: summary.canManageTeam,
      canAccessDashboard: summary.canAccessDashboard,
      canManageListings: summary.canManageListings,
      currentSponsorRole: summary.currentSponsorRole,
      currentSponsorId: summary.currentSponsorId,
      allSponsorRoles: summary.allSponsorRoles,
      checker, // 提供原始检查器以便进行更复杂的权限检查
      // 权限同步相关状态和方法
      isCheckingPermissions: isChecking,
      forcePermissionCheck: forceCheck,
    };
  }, [user]);

  return permissions;
};

/**
 * 专门用于检查是否为当前组织管理员的Hook（向后兼容）
 */
export const useIsAdminLoggedIn = () => {
  const { canManageTeam } = usePermissions();
  return canManageTeam;
};

/**
 * 检查用户在指定sponsor中的权限
 */
export const useSponsorPermissions = (sponsorId: string | null | undefined) => {
  const { checker } = usePermissions();
  
  return useMemo(() => {
    if (!checker || !sponsorId) {
      return {
        canManageTeamInSponsor: false,
        roleInSponsor: null as 'ADMIN' | 'MEMBER' | null,
      };
    }

    return {
      canManageTeamInSponsor: checker.canManageTeamInSponsor(sponsorId),
      roleInSponsor: checker.getSponsorRole(sponsorId),
    };
  }, [checker, sponsorId]);
};