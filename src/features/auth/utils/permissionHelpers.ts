import { type User } from '@prisma/client';

export type UserWithSponsors = User & {
  UserSponsors: Array<{
    sponsorId: string;
    role: 'ADMIN' | 'MEMBER';
  }>;
};

/**
 * 获取用户在当前sponsor中的角色
 */
export const getCurrentSponsorRole = (user: UserWithSponsors): 'ADMIN' | 'MEMBER' | null => {
  if (!user.currentSponsorId) return null;
  
  const sponsorRole = user.UserSponsors.find(
    us => us.sponsorId === user.currentSponsorId
  );
  
  return sponsorRole?.role || null;
};

/**
 * 检查用户是否可以管理团队成员
 */
export const canManageTeamMembers = (user: UserWithSponsors): boolean => {
  // GOD用户拥有最高权限
  if (user.role === 'GOD') return true;
  
  // 检查当前sponsor中的角色
  return getCurrentSponsorRole(user) === 'ADMIN';
};

/**
 * 检查用户是否为当前组织的管理员（前端专用）
 */
export const isCurrentSponsorAdmin = (user: UserWithSponsors): boolean => {
  return canManageTeamMembers(user);
};

/**
 * 检查用户是否可以访问sponsor dashboard
 */
export const canAccessSponsorDashboard = (user: UserWithSponsors): boolean => {
  // GOD用户可以访问任何dashboard
  if (user.role === 'GOD') return true;
  
  // 普通用户需要有当前sponsor关联
  return user.currentSponsorId !== null;
};

/**
 * 检查用户在指定sponsor组织中是否为ADMIN
 */
export const isSponsorAdmin = (user: UserWithSponsors, sponsorId: string): boolean => {
  // GOD用户在任何组织中都视为ADMIN
  if (user.role === 'GOD') return true;

  const sponsorRelation = user.UserSponsors.find(
    us => us.sponsorId === sponsorId
  );

  return sponsorRelation?.role === 'ADMIN';
};