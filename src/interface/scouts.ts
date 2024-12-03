/**
 * 人才推荐相关接口定义文件
 */

import { type User } from './user';

/**
 * 人才推荐接口
 * 定义推荐人的基本信息、推荐记录和收益等
 */
interface Scouts {
  id: string;              // 推荐记录ID
  userId: string;          // 推荐人ID
  listingId: string;       // 关联的赏金任务ID
  dollarsEarned: number;   // 获得的推荐费（美元）
  score: number;           // 推荐评分
  invited: boolean;        // 是否已邀请
  skills: string[];        // 技能标签
  createdAt: Date;         // 创建时间
  user: User;              // 推荐人信息
}

export type { Scouts };
