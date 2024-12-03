/**
 * 技能相关接口和常量定义文件
 */

import { type MultiSelectOptions } from '@/constants';

/**
 * 技能分类的中文标题映射
 */
const titlesForCN = {
  Design: '设计',
  Content: '内容',
  Development: '开发',
  Other: '其他',
};

/**
 * 技能和子技能的映射关系
 * 包含前端、后端、区块链、移动端等各个领域的具体技能
 */
const skillSubSkillMap = {
  // 前端开发技能
  Frontend: [
    { label: 'React', value: 'React' },
    { label: 'Svelte', value: 'Svelte' },
    { label: 'Angular', value: 'Angular' },
    { label: 'Vue', value: 'Vue' },
    { label: 'SolidJS', value: 'SolidJS' },
    { label: 'Redux', value: 'Redux' },
    { label: 'Elm', value: 'Elm' },
    { label: '其他', value: 'Other' },
  ],
  // 后端开发技能
  Backend: [
    { label: 'Javascript', value: 'Javascript' },
    { label: 'Typescript', value: 'Typescript' },
    { label: 'Node.js', value: 'Node.js' },
    { label: 'PHP', value: 'PHP' },
    { label: 'Laravel', value: 'Laravel' },
    { label: 'Python', value: 'Python' },
    { label: 'Django', value: 'Django' },
    { label: 'Kotlin', value: 'Kotlin' },
    { label: 'Swift', value: 'Swift' },
    { label: 'Java', value: 'Java' },
    { label: 'C++', value: 'C++' },
    { label: 'C', value: 'C' },
    { label: 'Ruby', value: 'Ruby' },
    { label: 'Ruby on Rails', value: 'Ruby on Rails' },
    { label: 'Go', value: 'Go' },
    { label: 'MySQL', value: 'MySQL' },
    { label: 'Postgres', value: 'Postgres' },
    { label: 'MongoDB', value: 'MongoDB' },
    { label: 'Perl', value: 'Perl' },
    { label: 'Scala', value: 'Scala' },
    { label: 'Elixir', value: 'Elixir' },
    { label: 'Haskell', value: 'Haskell' },
    { label: 'Erlang', value: 'Erlang' },
    { label: 'Deno', value: 'Deno' },
    { label: 'Dart', value: 'Dart' },
    { label: 'ASP.NET', value: 'ASP.NET' },
    { label: '其他', value: 'Other' },
  ],
  // 区块链开发技能
  Blockchain: [
    { label: 'Rust', value: 'Rust' },
    { label: 'Solidity', value: 'Solidity' },
    { label: 'Move', value: 'Move' },
    { label: '其他', value: 'Other' },
  ],
  // 移动端开发技能
  Mobile: [
    { label: 'Android', value: 'Android' },
    { label: 'iOS', value: 'iOS' },
    { label: 'Flutter', value: 'Flutter' },
    { label: 'React Native', value: 'React Native' },
    { label: '其他', value: 'Other' },
  ],
  // 设计技能
  Design: [
    { label: 'UI/UX 设计', value: 'UI/UX Design' },
    { label: '平面设计', value: 'Graphic Design' },
    { label: '插图', value: 'Illustration' },
    { label: '游戏设计', value: 'Game Design' },
    { label: '演示设计', value: 'Presentation Design' },
    { label: '其他', value: 'Other' },
  ],
  // 社区运营技能
  Community: [
    { label: '社区经理', value: 'Community Manager' },
    { label: 'Discord 管理员', value: 'Discord Moderator' },
    { label: '其他', value: 'Other' },
  ],
  // 增长技能
  Growth: [
    { label: '商务拓展', value: 'Business Development' },
    { label: '数字营销', value: 'Digital Marketing' },
    { label: '市场营销', value: 'Marketing' },
    { label: '其他', value: 'Other' },
  ],
  // 内容创作技能
  Content: [
    { label: '研究', value: 'Research' },
    { label: '摄影', value: 'Photography' },
    { label: '视频', value: 'Video' },
    { label: '视频编辑', value: 'Video Editing' },
    { label: '写作', value: 'Writing' },
    { label: '社交媒体', value: 'Social Media' },
    { label: '其他', value: 'Other' },
  ],
  // 其他技能
  Other: [
    { label: '数据分析', value: 'Data Analytics' },
    { label: '运营', value: 'Operations' },
    { label: '产品反馈', value: 'Product Feedback' },
    { label: '产品经理', value: 'Product Manager' },
  ],
} as const;

/**
 * 技能分类的中英文映射
 */
const skillMapCN = {
  Frontend: '前端',
  Backend: '后端',
  Blockchain: '区块链',
  Mobile: '移动',
  Design: '设计',
  Community: '社区',
  Growth: '增长',
  Content: '内容',
  Other: '其他',
};

/**
 * 主要技能选项列表
 * 用于多选组件的选项数据
 */
const MainSkills: MultiSelectOptions[] = Object.keys(skillSubSkillMap).map(
  (skill) => ({
    label: skillMapCN[skill],
    value: skill,
  }),
);

/**
 * 类型定义
 */
type ParentSkills = keyof typeof skillSubSkillMap;  // 父级技能类型
type SubSkillsType = (typeof skillSubSkillMap)[ParentSkills][number]['value'];  // 子技能类型

/**
 * 技能组合类型
 * 包含父级技能和对应的子技能列表
 */
type Skills = {
  skills: ParentSkills;
  subskills: SubSkillsType[];
}[];

/**
 * 技能映射类型
 * 用于定义技能的显示样式
 */
type SkillMap = {
  mainskill: ParentSkills;  // 主要技能
  color: string;            // 显示颜色
};

export type { ParentSkills, SkillMap, Skills, SubSkillsType };
export { MainSkills, skillMapCN, skillSubSkillMap, titlesForCN };
