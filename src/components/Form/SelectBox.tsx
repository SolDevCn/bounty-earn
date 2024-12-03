// 导入必要的UI组件
import { Box, FormLabel, Select } from '@chakra-ui/react';

// 选择框组件的Props接口
interface SelectBoxProps {
  label: string;                   // 选择框标签
  watchValue?: string;            // 当前选中的值（用于监听变化）
  options: string[];              // 选项列表
  id: string;                     // 组件唯一标识
  placeholder: string;            // 占位符文本
  register: any;                  // react-hook-form注册函数
  required?: boolean;             // 是否必填
}

// 选择框组件
export const SelectBox = ({
  label,
  watchValue,
  options,
  id,
  placeholder,
  register,
  required = false,
}: SelectBoxProps) => {
  return (
    <Box w={'full'} mb={'1.25rem'}>
      {/* 选择框标签 */}
      <FormLabel color={'brand.slate.500'}>{label}</FormLabel>
      {/* 下拉选择框 */}
      <Select
        color={watchValue?.length === 0 ? 'brand.slate.300' : ''}  // 根据是否有选中值设置颜色
        borderColor="brand.slate.300"
        _placeholder={{ color: 'brand.slate.300' }}
        focusBorderColor="brand.purple"
        id={id}
        placeholder={placeholder}
        {...register(id, { required })}  // 注册到react-hook-form
      >
        {/* 渲染选项列表 */}
        {options.map((option) => {
          return (
            <option key={option} value={option}>
              {option}
            </option>
          );
        })}
      </Select>
    </Box>
  );
};
