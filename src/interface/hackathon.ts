/**
 * 黑客松赛道相关接口定义文件
 */

/**
 * 黑客松赛道属性接口
 * 定义黑客松赛道的基本信息、赞助商和奖励等
 */
export interface TrackProps {
  title: string;           // 赛道标题
  slug: string;           // 赛道短链接
  sponsor: {              // 赞助商信息
    name: string;         // 赞助商名称
    logo: string;         // 赞助商logo
    st: boolean;          // 是否是Superteam成员
  };
  token: string;          // 奖励代币类型
  rewardAmount: number;   // 奖励金额
}
