/**
 * 项目方相关接口定义文件
 */

/**
 * 项目方类型接口
 * 定义项目方（赏金发布者）的基本信息、社交媒体和状态等
 */
interface SponsorType {
  // 基本信息
  id?: string;                // 项目方ID
  slug: string;              // 短链接（唯一标识）
  name: string;              // 项目方名称
  logo?: string;             // Logo图片URL
  url?: string;              // 官方网站
  industry?: string;         // 所属行业
  bio?: string;              // 项目简介
  entityName?: string;       // 实体名称（公司/组织名称）
  
  // 社交媒体
  twitter?: string;          // Twitter账号
  telegram?: string;         // Telegram账号
  wechat?: string;          // 微信账号
  
  // 状态标记
  isActive: boolean;         // 是否处于活跃状态
  isVerified?: boolean;      // 是否已验证
  isCaution?: boolean;       // 是否需要特别注意（风险标记）
  st?: boolean;              // 是否是Superteam成员
}

export type { SponsorType };
