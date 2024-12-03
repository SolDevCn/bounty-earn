// 导入必要的UI组件和表单控制器
import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
} from '@chakra-ui/react';
import React from 'react';
import { type Control, useController } from 'react-hook-form';

import { RichEditor } from '../shared/RichEditor';

// 富文本输入组件的Props接口
interface RichTextInputWithHelperProps {
  id: string;                              // 组件唯一标识
  label: string;                           // 标签文本
  helperText?: string;                     // 帮助文本
  placeholder?: string;                    // 占位符文本
  control: Control<any>;                   // react-hook-form的Control对象
  validate?: (value: string) => boolean | string;  // 自定义验证函数
  defaultValue?: string;                   // 默认值
  isRequired?: boolean;                    // 是否必填
  h?: string;                             // 高度
}

// 带帮助文本的富文本输入组件
const RichTextInputWithHelper: React.FC<RichTextInputWithHelperProps> = ({
  id,
  label,
  helperText,
  placeholder,
  control,
  validate,
  defaultValue,
  isRequired,
  h = 'auto',
}) => {
  // 使用react-hook-form的控制器管理表单状态
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: id,
    control,
    defaultValue: defaultValue || '',
    rules: {
      // 验证规则：必填检查和自定义验证
      validate: (value) => {
        if (
          isRequired &&
          (!value || value.trim() === '' || value.trim() === '<p></p>')
        ) {
          return '必填字段';
        }
        return validate ? validate(value) : true;
      },
    },
  });

  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      {/* 表单标签 */}
      <FormLabel mb={0} color={'brand.slate.600'} fontWeight={600} htmlFor={id}>
        {label}
      </FormLabel>
      {/* 帮助文本 */}
      <FormHelperText mt={0} mb={2} color="brand.slate.500">
        {helperText}
      </FormHelperText>
      {/* 富文本编辑器 */}
      <RichEditor
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isError={!!error}
        height={h}
      />
      {/* 错误消息 */}
      <FormErrorMessage>{error?.message}</FormErrorMessage>
    </FormControl>
  );
};

export default RichTextInputWithHelper;
