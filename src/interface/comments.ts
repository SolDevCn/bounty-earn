/**
 * 评论相关接口定义文件
 */

import type { User } from '@/interface/user';

/**
 * 评论类型枚举
 * NORMAL - 普通评论
 * SUBMISSION - 提交相关评论
 * DEADLINE_EXTENSION - 截止日期延期相关评论
 * WINNER_ANNOUNCEMENT - 获奖公告相关评论
 */
export type CommentType =
  | 'NORMAL'
  | 'SUBMISSION'
  | 'DEADLINE_EXTENSION'
  | 'WINNER_ANNOUNCEMENT';

/**
 * 评论接口
 * 定义评论的基本信息、作者、回复关系等
 */
export interface Comment {
  // 基本信息
  id: string;                     // 评论ID
  type: CommentType;              // 评论类型
  message: string;                // 评论内容
  updatedAt: Date;                // 更新时间
  
  // 作者信息
  authorId: string;               // 作者ID
  author: User;                   // 作者信息
  
  // 回复关系
  replyToId: string;             // 回复目标评论ID
  replies: Comment[];            // 子评论列表
  
  // 关联信息
  submissionId?: string;         // 关联的提交记录ID
  refId: string;                 // 引用ID
  refType: 'BOUNTY' | 'SUBMISSION'; // 引用类型（赏金任务/提交记录）
}
