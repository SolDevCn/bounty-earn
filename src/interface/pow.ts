/**
 * 作品集（Proof of Work）相关接口定义文件
 * 用于记录用户的作品和项目经历
 */

/**
 * 作品集接口
 * 定义用户作品的基本信息、技能标签和链接等
 */
export interface PoW {
  // 基本信息
  id?: string;            // 作品ID
  userId?: string;        // 所属用户ID
  title: string;          // 作品标题
  description: string;    // 作品描述
  link: string;          // 作品链接
  
  // 技能标签
  skills: string[];      // 主要技能
  subSkills: string[];   // 子技能
  
  // 时间戳
  createdAt?: string;    // 创建时间
  updatedAt?: string;    // 更新时间
}
