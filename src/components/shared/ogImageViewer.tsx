/**
 * OpenGraph图片查看器组件
 * 用于显示和管理OpenGraph图片，支持外部URL的图片获取和本地fallback图片
 */

import {
  Image,
  type ImageProps,
  type ResponsiveValue,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';

import { ogImageQuery } from '@/queries/og';

/**
 * 组件属性接口定义
 * @interface Props
 * @property {string} [title] - 图片标题
 * @property {boolean} [showTitle] - 是否显示标题
 * @property {string} [externalUrl] - 外部URL，用于获取OG图片
 * @property {string} [imageUrl] - 直接指定的图片URL
 * @property {ResponsiveValue<string | number>} [w] - 宽度
 * @property {ResponsiveValue<string | number>} [h] - 高度
 * @property {ImageProps['objectFit']} [objectFit] - 图片适应方式
 * @property {string | number} [borderTopRadius] - 上边框圆角
 * @property {string | number} [borderRadius] - 边框圆角
 * @property {ResponsiveValue<string | number>} [aspectRatio] - 宽高比
 * @property {string} [id] - 图片ID
 * @property {'submission' | 'pow'} [type] - 图片类型
 */
interface Props {
  title?: string;
  showTitle?: boolean;
  externalUrl?: string;
  imageUrl?: string;
  w?: ResponsiveValue<string | number>;
  h?: ResponsiveValue<string | number>;
  objectFit?: ImageProps['objectFit'];
  borderTopRadius?: string | number;
  borderRadius?: string | number;
  aspectRatio?: ResponsiveValue<string | number>;
  id?: string;
  type?: 'submission' | 'pow';
}

/**
 * 获取随机fallback图片URL
 * 当主图片加载失败时使用
 * @returns {string} 随机fallback图片的URL
 */
const getRandomFallbackImage = (): string => {
  const _fallbackImages = [
    '/assets/fallback/og/1.webp',
    '/assets/fallback/og/2.webp',
    '/assets/fallback/og/3.webp',
    '/assets/fallback/og/4.webp',
    '/assets/fallback/og/5.webp',
    '/assets/fallback/og/6.webp',
    '/assets/fallback/og/7.webp',
    '/assets/fallback/og/8.webp',
    '/assets/fallback/og/9.webp',
    '/assets/fallback/og/10.webp',
    '/assets/fallback/og/11.webp',
  ];

  const fallbackImages = [
    '/assets/fallback/og/1.jpg',
    '/assets/fallback/og/2.jpg',
    '/assets/fallback/og/3.jpg',
    '/assets/fallback/og/4.jpg',
    '/assets/fallback/og/5.jpg',
    '/assets/fallback/og/6.jpg',
    '/assets/fallback/og/7.jpg',
  ];

  const randomIndex = Math.floor(Math.random() * fallbackImages.length);
  return fallbackImages[randomIndex]!;
};

/**
 * OpenGraph图片查看器组件
 * 功能：
 * 1. 支持直接显示图片URL
 * 2. 支持从外部URL获取OG图片
 * 3. 图片加载失败时显示随机fallback图片
 * 4. 可选显示图片标题
 * 5. 支持图片加载状态显示
 */
export const OgImageViewer = ({
  title,
  showTitle,
  externalUrl,
  imageUrl,
  type,
  id,
  ...props
}: Props) => {
  const fallbackImage = getRandomFallbackImage();
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    imageUrl || null,
  );

  const { data: ogData, isLoading } = useQuery(ogImageQuery(externalUrl!));

  useEffect(() => {
    const updateOgImage = async () => {
      if (ogData?.images?.[0]?.url && type && id) {
        try {
          await axios.post('/api/og/update', {
            type,
            url: ogData.images[0].url,
            id,
          });
          setCurrentImageUrl(ogData.images[0].url);
        } catch (error) {
          await axios.post('/api/og/update', {
            type,
            url: 'error',
            id,
          });
          setCurrentImageUrl(fallbackImage);
        }
      } else if (!imageUrl && !externalUrl) {
        setCurrentImageUrl(fallbackImage);
      }
    };

    if (!currentImageUrl) {
      updateOgImage();
    } else if (currentImageUrl === 'error') {
      setCurrentImageUrl(fallbackImage);
    }
  }, [ogData, imageUrl, externalUrl, type, id, fallbackImage]);

  const handleImageError = useCallback(() => {
    setCurrentImageUrl(fallbackImage);
  }, [fallbackImage]);

  if (isLoading) {
    return <Skeleton {...props} />;
  }

  return (
    <div>
      <Image
        bgPosition={'center'}
        alt="OG Image"
        onError={handleImageError}
        src={currentImageUrl || fallbackImage}
        {...props}
      />
      {showTitle && (
        <Text
          pt={2}
          color="brand.slate.500"
          fontSize="sm"
          textOverflow="ellipsis"
          noOfLines={1}
        >
          {title || ogData?.title || ''}
        </Text>
      )}
    </div>
  );
};
