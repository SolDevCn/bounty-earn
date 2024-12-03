/**
 * 用户国旗组件
 * 用于显示用户所在国家/地区的旗帜图标
 * 使用flag-icons库实现国旗显示
 */

import '/node_modules/flag-icons/css/flag-icons.min.css';

import { Center } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { countries } from '@/constants';

/**
 * 组件属性接口
 * @interface Props
 * @property {string} location - 国家/地区名称或代码
 * @property {string} [size='16px'] - 国旗图标尺寸
 * @property {boolean} [isCode=false] - location是否为国家代码
 */
interface Props {
  location: string;
  size?:
    | '12px'
    | '14px'
    | '16px'
    | '20px'
    | '24px'
    | '28px'
    | '32px'
    | '36px'
    | '40px'
    | '44px'
    | '52px'
    | '64px';
  isCode?: boolean;
}

/**
 * UserFlag组件
 * 功能：
 * 1. 支持通过国家名称或代码显示对应国旗
 * 2. 提供多种预设尺寸选项
 * 3. 支持特殊区域（如balkan）的自定义图标
 * 4. 自动处理国家名称到代码的转换
 */
export function UserFlag({ location, size = '16px', isCode = false }: Props) {
  // 存储国家代码
  const [code, setCode] = useState<string | null>(null);

  // 根据location获取国家代码
  useEffect(() => {
    if (isCode) {
      setCode(location.toLowerCase());
    } else {
      const country = countries.find(
        (c) => c.name.toLowerCase() === location.toLowerCase(),
      );
      if (country) {
        setCode(country.code);
      }
    }
  }, [location]);

  // 特殊处理balkan地区
  return code === 'balkan' ? (
    <Center
      bgImage={'/assets/superteams/logos/balkan.png'}
      bgSize={'contain'}
      borderWidth="1px"
      borderStyle="solid"
      borderColor="brand.slate.50"
      rounded="full"
      style={{ width: size, height: size }}
    />
  ) : (
    <Center
      className={`fi fi-${code} fis`}
      borderWidth="1px"
      borderStyle="solid"
      borderColor="brand.slate.50"
      rounded="full"
      style={{ width: size, height: size }}
    />
  );
}
