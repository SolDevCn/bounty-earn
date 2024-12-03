/**
 * 链接文本解析器组件
 * 用于将文本中的URL转换为可点击的链接
 */

import { Link, Text, type TextProps } from '@chakra-ui/react';
import { Fragment } from 'react';

/**
 * URL匹配的正则表达式
 * 匹配以http://或https://开头的URL
 */
const URL_REGEX =
  /(\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

/**
 * 组件属性接口定义
 * 继承自Chakra UI的TextProps，并添加text属性
 * @property {string} text - 需要解析的文本内容
 */
type Props = TextProps & {
  text: string;
};

/**
 * 链接文本解析器组件
 * 功能：
 * 1. 接收一段文本作为输入
 * 2. 使用正则表达式识别文本中的URL
 * 3. 将URL转换为可点击的链接
 * 4. 保持非URL文本原样显示
 * 5. 支持所有Chakra UI Text组件的属性
 */
export function LinkTextParser({ text, ...props }: Props) {
  // 使用URL_REGEX分割文本
  const parts = text.split(URL_REGEX);

  return (
    <Text {...props}>
      {parts.map((part, index) => {
        // 如果部分文本匹配URL格式，转换为链接
        if (part.match(URL_REGEX)) {
          return (
            <Link
              key={index}
              color="brand.purple"
              _hover={{ textDecoration: 'underline' }}
              href={part}
              isExternal
            >
              {part}
            </Link>
          );
        }
        // 非URL部分直接显示
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </Text>
  );
}
