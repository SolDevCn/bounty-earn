// 导入必要的UI组件和React hooks
import { Box, FormLabel } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ReactSelect, { type SingleValue } from 'react-select';

import { chinaArea } from '@/constants';

// 地区选择框Props接口
interface AreaSelectBox {
  label: string;                   // 选择框标签
  watchValue?: string;            // 当前选中的值
  id: string;                     // 组件唯一标识
  placeholder: string;            // 占位符文本
  register: any;                  // react-hook-form注册函数
  required?: boolean;             // 是否必填
}

// 国家/地区选项接口
interface CountryOption {
  value: string;                  // 选项值
  label: string;                  // 选项标签
}

// 分组选项接口（省份及其城市）
interface GroupedOption {
  label: string;                  // 分组标签（省份名）
  options: CountryOption[];       // 分组选项（城市列表）
}

// 选项类型：可以是单个选项或分组选项
type SelectOption = CountryOption | GroupedOption;

// 地区选择框组件
export const AreaSelectBox = ({
  label,
  watchValue,
  id,
  placeholder,
  register,
  required = false,
}: AreaSelectBox) => {
  // 当前选中值的状态
  const [selectedValue, setSelectedValue] = useState(watchValue);

  // 处理选项数据：将中国地区数据转换为react-select需要的格式
  const selectOptions: SelectOption[] = useMemo(() => {
    // 将每个省份及其城市转换为分组选项格式
    const list = chinaArea.map((area) => ({
      label: area.name,
      options: area.children.map((city) => ({
        value: city.name,
        label: city.name,
      })),
    }));
    return [...list];
  }, []);

  // 当watchValue变化时更新选中值
  useEffect(() => {
    setSelectedValue(watchValue);
  }, [watchValue]);

  return (
    <Box w={'full'} mb={'1.25rem'}>
      {/* 选择框标签 */}
      <FormLabel color={'brand.slate.500'}>{label}</FormLabel>
      {/* React Select组件 */}
      <ReactSelect
        options={selectOptions}
        placeholder={placeholder}
        {...register(id, { required })}
        // 自定义样式
        styles={{
          control: (base) => ({
            ...base,
            borderColor: 'brand.slate.300',
            '&:hover': { borderColor: 'brand.purple' },
            boxShadow: 'none',
          }),
          placeholder: (base) => ({
            ...base,
            color: 'brand.slate.300',
          }),
        }}
        // 设置当前选中值
        value={selectOptions
          .flatMap((option) => ('options' in option ? option.options : option))
          .find((option) => option.value === selectedValue)}
        // 处理选项变化
        onChange={(newValue: SingleValue<any>) => {
          if (newValue) {
            // 更新内部状态
            setSelectedValue(newValue.value);
            // 触发表单变化事件
            register(id).onChange({
              target: { name: id, value: newValue.value },
            });
          }
        }}
      />
    </Box>
  );
};
