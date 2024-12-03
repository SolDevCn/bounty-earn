/**
 * 用户-项目方关联关系接口定义文件
 * 用于定义用户与项目方之间的多对多关系
 */

import type { Role } from '@prisma/client';

import type { SponsorType } from '@/interface/sponsor';
import type { User } from '@/interface/user';

/**
 * 用户-项目方关联关系接口
 * 记录用户在项目方中的角色和关系
 */
interface UserSponsor {
  userId?: string;           // 用户ID
  sponsorId?: string;        // 项目方ID
  role?: Role;               // 用户在项目方中的角色
  createdAt?: string;        // 关联创建时间
  updatedAt?: string;        // 关联更新时间
  user?: User;               // 关联的用户信息
  sponsor?: SponsorType;     // 关联的项目方信息
}

export type { UserSponsor };
