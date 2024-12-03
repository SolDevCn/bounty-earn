/**
 * 提交记录相关接口定义文件
 */

import { type SubmissionLabels, type SubmissionStatus } from '@prisma/client';

import type { Listing, Rewards } from '@/features/listings';

import { type User } from './user';

/**
 * 带用户信息的提交记录接口
 * 定义赏金任务的提交记录及其相关状态、奖励信息等
 */
interface SubmissionWithUser {
  // 基本信息
  id: string;                     // 提交记录ID
  userId: string;                 // 提交用户ID
  listingId: string;             // 关联的赏金任务ID
  status: SubmissionStatus;       // 提交状态
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
  
  // 提交内容
  link?: string;                  // 提交链接
  tweet?: string;                 // 相关推文
  otherInfo?: string;            // 其他信息
  eligibilityAnswers?: any;      // 资格问题答案
  notes?: string;                // 备注
  
  // 获奖信息
  isWinner: boolean;             // 是否获奖
  winnerPosition?: keyof Rewards; // 获奖名次
  isPaid: boolean;               // 是否已支付
  paymentDetails?: {             // 支付详情
    txId?: string;               // 交易ID
  };
  rewardInUSD: number;           // 奖励金额（美元）
  ask?: number;                  // 要求金额
  
  // 状态标记
  isActive: boolean;             // 是否活跃
  isArchived: boolean;           // 是否已归档
  label: SubmissionLabels;       // 提交标签
  
  // 关联数据
  like?: any;                    // 点赞信息
  user: User;                    // 提交用户信息
  listing?: Listing;             // 关联的赏金任务信息
}

export type { SubmissionWithUser };
