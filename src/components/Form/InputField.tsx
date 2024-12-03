// 导入必要的UI组件和表单类型
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Text,
} from '@chakra-ui/react';
import { type FieldErrors, type UseFormRegister } from 'react-hook-form';

// 输入字段组件的Props类型定义
type InputFieldProps = {
  label: string;                   // 输入字段标签
  placeholder: string;             // 占位符文本
  name: string;                    // 字段名称
  register: UseFormRegister<any>;  // react-hook-form注册函数
  isInvalid?: boolean;            // 是否为无效状态
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;  // 值变化回调
  validationErrorMessage?: string; // 验证错误消息
  isRequired?: boolean;           // 是否必填
  errors: FieldErrors<any>;       // 表单错误对象
  validate?: (value: string) => boolean | string;  // 自定义验证函数
};

// 输入字段组件
export const InputField = ({
  label,
  placeholder,
  name,
  register,
  isInvalid = false,
  onChange,
  validationErrorMessage,
  validate,
  errors,
  isRequired = false,
}: InputFieldProps) => {
  // 非空验证函数
  const validateNonEmpty = (value: string) => {
    return value.trim() !== '' || '必填字段';
  };

  // 组合验证函数：结合必填验证和自定义验证
  const combinedValidate = (value: string) => {
    if (isRequired) {
      const nonEmptyResult = validateNonEmpty(value);
      if (nonEmptyResult !== true) {
        return nonEmptyResult;
      }
    }
    return validate ? validate(value) : true;
  };

  return (
    <FormControl
      w={'full'}
      mb={'1.25rem'}
      isInvalid={isInvalid || !!errors?.[name]}
    >
      {/* 字段标签 */}
      <FormLabel color={'brand.slate.500'}>{label}</FormLabel>
      {/* 输入框 */}
      <Input
        color={'gray.800'}
        borderColor="brand.slate.300"
        _placeholder={{
          color: 'brand.slate.300',
        }}
        focusBorderColor="brand.purple"
        id={name}
        placeholder={placeholder}
        {...register(name, {
          required: isRequired ? '必填字段' : false,
          validate: combinedValidate,
        })}
        isInvalid={isInvalid || !!errors?.[name]}
        onChange={onChange}
      />
      {/* 自定义错误消息 */}
      {isInvalid && validationErrorMessage && (
        <Text color={'red'} fontSize={'sm'}>
          {validationErrorMessage}
        </Text>
      )}
      {/* 表单错误消息 */}
      <FormErrorMessage>
        {errors && errors[name] && errors[name]?.message?.toString()}
        {validationErrorMessage ? <>{validationErrorMessage}</> : <></>}
      </FormErrorMessage>
    </FormControl>
  );
};
