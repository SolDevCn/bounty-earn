/**
 * 用户相关接口定义文件
 */

import type { EmailSettings } from '@prisma/client';

import type { SponsorType } from '@/interface/sponsor';
import type { UserSponsor } from '@/interface/userSponsor';

import type { PoW } from './pow';
import type { SubmissionWithUser } from './submission';

/**
 * 用户接口
 * 定义用户的基本信息、个人资料、社交媒体和系统设置等
 */
interface User {
  // 基本信息
  id?: string;                    // 用户ID
  publicKey?: string;             // 公钥
  firstName?: string;             // 名
  lastName?: string;              // 姓
  email?: string;                 // 邮箱
  username?: string;              // 用户名
  isVerified?: boolean;           // 是否已验证
  createdAt?: string;            // 创建时间
  updatedAt?: string;            // 更新时间
  
  // 角色和状态
  role?: string;                  // 用户角色
  talent?: boolean;               // 是否是人才
  sponsor?: boolean;              // 是否是项目方
  superteamLevel?: string;        // Superteam等级
  isTalentFilled?: boolean;       // 是否已填写人才信息
  private?: boolean;              // 是否是私密账户
  
  // 个人资料
  bio?: string;                   // 个人简介
  location?: string;              // 所在地
  photo?: string;                 // 头像
  experience?: string;            // 工作经验
  cryptoExperience?: string;      // 加密货币经验
  currentEmployer?: string;       // 当前雇主
  community?: string;             // 所属社区
  interests?: string;             // 兴趣爱好
  skills?: string;                // 技能
  subSkills?: string;             // 子技能
  workPrefernce?: string;         // 工作偏好
  
  // 社交媒体
  discord?: string;               // Discord账号
  twitter?: string;               // Twitter账号
  github?: string;                // GitHub账号
  linkedin?: string;              // LinkedIn账号
  website?: string;               // 个人网站
  telegram?: string;              // Telegram账号
  wechat?: string;                // 微信账号
  
  // 项目方关联
  currentSponsorId?: string;      // 当前项目方ID
  currentSponsor?: SponsorType;   // 当前项目方信息
  UserSponsors?: UserSponsor[];   // 用户关联的所有项目方
  
  // 作品和提交
  PoW?: PoW[];                    // 作品列表
  Submission?: SubmissionWithUser[]; // 提交记录
  
  // 黑客松相关
  hackathonId?: string;           // 黑客松ID
  Hackathon?: {                   // 黑客松信息
    id: string;                   // 黑客松ID
    slug: string;                 // 短链接
    name: string;                 // 名称
    logo: string;                 // Logo
    altLogo: string;              // 备用Logo
    description: string;          // 描述
    sponsorId: string;            // 主办方ID
    startDate: string;            // 开始日期
    deadline: string;             // 截止日期
    announceDate: string;         // 公布日期
  };
  
  // 系统设置
  featureModalShown?: boolean;    // 是否显示过功能介绍
  surveysShown?: Record<string, boolean>; // 问卷显示记录
  stRecommended?: boolean;        // 是否被Superteam推荐
  acceptedTOS?: boolean;          // 是否接受服务条款
  emailSettings?: EmailSettings[]; // 邮件通知设置
  stLead?: string;                // Superteam负责人
}

export type { User };
