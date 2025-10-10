import { type User } from '@prisma/client';

export type UserWithPermissions = User & {
  UserSponsors: Array<{
    sponsorId: string;
    role: 'ADMIN' | 'MEMBER';
  }>;
};

/**
 * 权限错误类
 */
export class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 统一权限检查类 - 前后端通用
 */
export class PermissionChecker {
  constructor(private user: UserWithPermissions) {}

  /**
   * 是否为GOD用户
   */
  isGod(): boolean {
    return this.user.role === 'GOD';
  }

  /**
   * 获取在当前sponsor中的角色
   */
  getCurrentSponsorRole(): 'ADMIN' | 'MEMBER' | null {
    if (!this.user.currentSponsorId) return null;
    
    const sponsorRelation = this.user.UserSponsors.find(
      us => us.sponsorId === this.user.currentSponsorId
    );
    
    return sponsorRelation?.role || null;
  }

  /**
   * 获取在指定sponsor中的角色
   */
  getSponsorRole(sponsorId: string): 'ADMIN' | 'MEMBER' | null {
    const sponsorRelation = this.user.UserSponsors.find(
      us => us.sponsorId === sponsorId
    );
    
    return sponsorRelation?.role || null;
  }

  /**
   * 是否可以管理团队成员
   */
  canManageTeam(): boolean {
    return this.isGod() || this.getCurrentSponsorRole() === 'ADMIN';
  }

  /**
   * 是否可以访问sponsor dashboard
   */
  canAccessDashboard(): boolean {
    return this.isGod() || this.user.currentSponsorId !== null;
  }

  /**
   * 是否可以管理listings
   */
  canManageListings(): boolean {
    // GOD或当前组织的ADMIN/MEMBER都可以管理listings
    return this.isGod() || this.getCurrentSponsorRole() !== null;
  }

  /**
   * 是否可以在指定sponsor中管理团队
   */
  canManageTeamInSponsor(sponsorId: string): boolean {
    return this.isGod() || this.getSponsorRole(sponsorId) === 'ADMIN';
  }

  /**
   * 断言权限（用于API）
   */
  assertCanManageTeam(): void {
    if (!this.canManageTeam()) {
      throw new PermissionError(
        'Insufficient permissions: Admin role required for team management'
      );
    }
  }

  assertCanAccessDashboard(): void {
    if (!this.canAccessDashboard()) {
      throw new PermissionError(
        'Insufficient permissions: Sponsor membership required'
      );
    }
  }

  assertCanManageListings(): void {
    if (!this.canManageListings()) {
      throw new PermissionError(
        'Insufficient permissions: Sponsor membership required for listings management'
      );
    }
  }

  assertCanManageTeamInSponsor(sponsorId: string): void {
    if (!this.canManageTeamInSponsor(sponsorId)) {
      throw new PermissionError(
        'Insufficient permissions: Admin role required for this sponsor'
      );
    }
  }

  /**
   * 获取用户的完整权限摘要
   */
  getPermissionSummary() {
    return {
      isGod: this.isGod(),
      currentSponsorId: this.user.currentSponsorId,
      currentSponsorRole: this.getCurrentSponsorRole(),
      canManageTeam: this.canManageTeam(),
      canManageListings: this.canManageListings(),
      canAccessDashboard: this.canAccessDashboard(),
      allSponsorRoles: this.user.UserSponsors.map(us => ({
        sponsorId: us.sponsorId,
        role: us.role,
      })),
    };
  }
}

/**
 * 创建权限检查器
 */
export const createPermissionChecker = (user: UserWithPermissions) => {
  return new PermissionChecker(user);
};