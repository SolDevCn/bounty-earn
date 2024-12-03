// 导入必要的UI组件和类型
import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Text,
} from '@chakra-ui/react';
import { type ReactElement } from 'react';

import { AutoResizeTextarea } from '../shared/autosize-textarea';

// 带字数统计的文本区域组件Props接口
interface TextAreaWithCounterProps {
  id: string;                     // 组件唯一标识
  label: string;                  // 标签文本
  helperText: string;            // 帮助文本
  placeholder: string;           // 占位符文本
  register: any;                 // react-hook-form注册函数
  validate?: any;                // 自定义验证函数
  watch: any;                    // react-hook-form监听函数
  maxLength?: number;            // 最大字符数
  errors: any;                   // 表单错误对象
  isRequired?: boolean;          // 是否必填
  minH?: string;                 // 最小高度
}

// 带帮助文本的输入框组件Props接口
interface TextInputWithHelperProps {
  id: string;                     // 组件唯一标识
  label: string;                  // 标签文本
  helperText: ReactElement | string; // 帮助文本（可以是React元素或字符串）
  placeholder: string;           // 占位符文本
  register: any;                 // react-hook-form注册函数
  errors: any;                   // 表单错误对象
  validate?: any;                // 自定义验证函数
  defaultValue?: string;         // 默认值
  type?: string;                 // 输入框类型
  isRequired?: boolean;          // 是否必填
  readOnly?: boolean;            // 是否只读
}

// 带字数统计的文本区域组件
export const TextAreaWithCounter = ({
  id,
  label,
  helperText,
  placeholder,
  register,
  validate,
  watch,
  maxLength = 2000,
  errors,
  isRequired,
  minH = 'unset',
}: TextAreaWithCounterProps) => (
  <FormControl isRequired={isRequired}>
    {/* 标签 */}
    <FormLabel mb={0} color={'brand.slate.600'} fontWeight={600} htmlFor={id}>
      {label}
    </FormLabel>
    {/* 帮助文本 */}
    <FormHelperText mt={0} mb={2} color="brand.slate.500">
      {helperText}
    </FormHelperText>
    {/* 自动调整高度的文本区域 */}
    <AutoResizeTextarea
      borderColor={'brand.slate.300'}
      _placeholder={{ color: 'brand.slate.300' }}
      focusBorderColor="brand.purple"
      id={id}
      placeholder={placeholder}
      {...register(id, { validate })}
      maxLength={maxLength}
      minH={minH}
    />
    {/* 字数统计显示 */}
    <Text
      color={
        (watch(id)?.length || 0) > maxLength - 30 ? 'red' : 'brand.slate.400'
      }
      fontSize={'xs'}
      textAlign="right"
    >
      {watch(id)?.length > maxLength - 80 &&
        (maxLength - (watch(id)?.length || 0) === 0 ? (
          <p>字符数已达上限</p>
        ) : (
          <p>还剩 {maxLength - (watch(id)?.length || 0)}</p>
        ))}
    </Text>
    {/* 错误信息显示 */}
    <FormErrorMessage>
      {errors[id] ? <>{errors[id].message}</> : <></>}
    </FormErrorMessage>
  </FormControl>
);

// 带帮助文本的输入框组件
export const TextInputWithHelper = ({
  id,
  label,
  helperText,
  placeholder,
  register,
  errors,
  validate,
  defaultValue,
  type = 'text',
  isRequired,
  readOnly = false,
}: TextInputWithHelperProps) => (
  <FormControl isRequired={isRequired}>
    {/* 标签 */}
    <FormLabel mb={0} color={'brand.slate.600'} fontWeight={600} htmlFor={id}>
      {label}
    </FormLabel>
    {/* 帮助文本 */}
    <FormHelperText mt={0} mb={2} color="brand.slate.500">
      {helperText}
    </FormHelperText>
    {/* 输入框 */}
    <Input
      borderColor={'brand.slate.300'}
      _placeholder={{ color: 'brand.slate.300' }}
      focusBorderColor="brand.purple"
      id={id}
      isDisabled={readOnly}
      placeholder={placeholder}
      readOnly={readOnly}
      {...register(id, { validate })}
      defaultValue={defaultValue}
      type={type}
    />
    {/* 错误信息显示 */}
    <FormErrorMessage>{errors[id] && errors[id].message}</FormErrorMessage>
  </FormControl>
);
