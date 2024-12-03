// 导入必要的UI组件和React hooks
import {
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Image,
  Tooltip,
} from '@chakra-ui/react';
import React, { type Dispatch, type SetStateAction, useState } from 'react';
import ReactSelect from 'react-select';
import makeAnimated from 'react-select/animated';

import { type MultiSelectOptions } from '@/constants';
import { MainSkills, skillSubSkillMap } from '@/interface/skills';

// 移除数组中的重复选项
function removeDuplicates(arr: MultiSelectOptions[]): MultiSelectOptions[] {
  return Array.from(
    arr
      .reduce((map, item) => {
        if (!map.has(item.value)) {
          map.set(item.value, item);
        }
        return map;
      }, new Map<string, MultiSelectOptions>())
      .values(),
  );
}

// 技能选择组件的Props接口
interface Props {
  skills: MultiSelectOptions[];           // 已选择的主要技能列表
  subSkills: MultiSelectOptions[];        // 已选择的子技能列表
  setSkills: Dispatch<SetStateAction<MultiSelectOptions[]>>;      // 设置主要技能的函数
  setSubSkills: Dispatch<SetStateAction<MultiSelectOptions[]>>;   // 设置子技能的函数
  errorSkill?: boolean;                   // 主要技能的错误状态
  errorSubSkill?: boolean;                // 子技能的错误状态
  skillLabel?: string;                    // 主要技能的标签文本
  subSkillLabel?: string;                 // 子技能的标签文本
  helperText?: string;                    // 帮助文本
}

// 技能选择组件
export const SkillSelect = ({
  skills,
  subSkills,
  errorSkill,
  errorSubSkill,
  setSkills,
  setSubSkills,
  skillLabel = '所需技能',
  subSkillLabel = '所需子技能',
  helperText,
}: Props) => {
  // 创建动画组件实例
  const animatedComponents = makeAnimated();
  
  // 根据已选择的主要技能，获取对应的子技能选项
  const tempSubSkills: MultiSelectOptions[] = [];
  skills.forEach((s) => {
    const subSkillsForSkill =
      skillSubSkillMap[s.value as keyof typeof skillSubSkillMap];
    // 检查子技能是否存在且为数组
    if (Array.isArray(subSkillsForSkill)) {
      tempSubSkills.push(...subSkillsForSkill);
    }
  });

  // 管理子技能选项的状态
  const [subSkillOptions, setSubSkillOptions] =
    useState<MultiSelectOptions[]>(tempSubSkills);

  // 处理主要技能变化时的回调
  const handleChange = (e: MultiSelectOptions[]) => {
    const sub: MultiSelectOptions[] = [];
    e.forEach((op) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sub.push(...(skillSubSkillMap[op.value as any] as any));
    });
    // 更新子技能选项列表
    setSubSkillOptions(sub);
  };

  return (
    <>
      {/* 主要技能选择区域 */}
      <FormControl mb={5} isRequired>
        <Flex align={'center'} justify={'start'}>
          <FormLabel
            color={'brand.slate.500'}
            fontWeight={500}
            htmlFor={'skills'}
          >
            {skillLabel}
          </FormLabel>
          {/* 提示信息图标 */}
          <Tooltip
            w="max"
            p="0.7rem"
            color="white"
            fontSize="sm"
            fontWeight={500}
            bg="brand.purple"
            borderRadius="0.5rem"
            hasArrow
            label={`请选择所有适用项`}
            placement="right-end"
          >
            <Image mt={-2} alt="" src={'/assets/icons/info-icon.svg'} />
          </Tooltip>
        </Flex>
        {/* 帮助文本 */}
        {helperText && (
          <FormHelperText
            mt={-2}
            mb={3}
            ml={0.5}
            color="brand.slate.400"
            fontSize={'13px'}
          >
            {helperText}
          </FormHelperText>
        )}

        {/* 主要技能多选框 */}
        <ReactSelect
          styles={{
            control: (baseStyles, state) => ({
              ...baseStyles,
              border: errorSkill ? '2px solid red' : baseStyles.border,
              backgroundColor: 'brand.slate.500',
              borderColor: state.isFocused ? 'brand.purple' : 'brand.slate.300',
            }),
          }}
          closeMenuOnSelect={false}
          components={animatedComponents}
          isMulti
          value={skills}
          required={true}
          options={MainSkills}
          onChange={(e) => {
            handleChange(e as any);
            setSkills(e as any);
          }}
        />
      </FormControl>

      {/* 子技能选择区域 */}
      <FormControl mb={5} isRequired>
        <Flex align={'center'} justify={'start'}>
          <FormLabel
            color={'brand.slate.500'}
            fontWeight={500}
            htmlFor={'subskills'}
          >
            {subSkillLabel}
          </FormLabel>
          {/* 提示信息图标 */}
          <Tooltip
            w="max"
            p="0.7rem"
            color="white"
            fontSize="sm"
            fontWeight={500}
            bg="brand.purple"
            borderRadius="0.5rem"
            hasArrow
            label={`请选择所有适用项`}
            placement="right-end"
          >
            <Image mt={-2} alt="" src={'/assets/icons/info-icon.svg'} />
          </Tooltip>
        </Flex>
        {/* 子技能多选框 */}
        <ReactSelect
          styles={{
            control: (baseStyles, state) => ({
              ...baseStyles,
              border: errorSubSkill ? '2px solid red' : baseStyles.border,
              backgroundColor: 'brand.slate.500',
              borderColor: state.isFocused ? 'brand.purple' : 'brand.slate.300',
            }),
          }}
          closeMenuOnSelect={false}
          components={animatedComponents}
          isMulti
          value={subSkills}
          required={true}
          options={removeDuplicates(subSkillOptions)}
          onChange={(e) => {
            setSubSkills(e as any);
          }}
        />
      </FormControl>
    </>
  );
};
