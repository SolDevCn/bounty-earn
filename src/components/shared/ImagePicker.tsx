// 导入必要的UI组件和图标
import { CloseIcon } from '@chakra-ui/icons';
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Image,
  Input,
  Text,
} from '@chakra-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import { RxUpload } from 'react-icons/rx';
import { toast } from 'sonner';

// 图片选择器组件Props接口
interface ImagePickerProps {
  onChange?: (file: File) => void;      // 图片变化时的回调函数
  onReset?: () => void;                 // 重置图片时的回调函数
  defaultValue?: {                      // 默认图片值
    url: string;
  };
}

// 图片选择器组件
export const ImagePicker = ({
  onChange,
  onReset,
  defaultValue,
}: ImagePickerProps) => {
  // 图片预览URL状态
  const [preview, setPreview] = useState<string | null>(
    defaultValue?.url || null,
  );
  // 当默认值变化时更新预览
  useEffect(() => {
    setPreview(defaultValue?.url || null);
  }, [defaultValue]);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  // 文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件变化
  const handleFileChange = (file: File | null | undefined) => {
    if (file) {
      // 检查文件大小（5MB限制）
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小必须小于 5MB');
        return;
      }

      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('不支持的文件格式。请使用 JPEG、PNG 或 WebP');
        return;
      }

      // 创建预览URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange && onChange(file);
    }
  };

  // 重置图片选择
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onReset && onReset();
  };

  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理文件放置
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  return (
    <Box
      pos={'relative'}
      p={4}
      border="1px dashed"
      borderColor={isDragging ? 'brand.primary' : 'brand.slate.300'}
      borderRadius="md"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Flex>
        {/* 图片预览区域 */}
        {preview ? (
          <Image
            w={20}
            h={20}
            borderRadius={'xl'}
            objectFit={'cover'}
            alt="Preview"
            src={preview}
          />
        ) : (
          // 上传图标
          <Flex
            align={'center'}
            justify={'center'}
            w={20}
            h={20}
            bg="brand.slate.100"
            borderRadius={'xl'}
          >
            <Icon as={RxUpload} boxSize={6} color="brand.slate.500" />
          </Flex>
        )}
        {/* 删除图片按钮 */}
        {preview && (
          <IconButton
            pos="absolute"
            zIndex={1}
            top={3}
            right={3}
            color={'brand.slate.400'}
            bg={'transparent'}
            _hover={{ bg: 'brand.slate.100' }}
            aria-label="Remove image"
            icon={<CloseIcon />}
            onClick={handleReset}
            size="sm"
          />
        )}

        {/* 提示文本 */}
        <Flex justify={'center'} direction={'column'} px={5}>
          <Text mb={1} color={'brand.slate.500'} fontWeight={600}>
            选择或拖拽图片
          </Text>
          <Text color="brand.slate.400" fontSize="sm">
            图片最大体积不超过 5 MB
          </Text>
        </Flex>
      </Flex>
      {/* 隐藏的文件输入框 */}
      <Input
        ref={fileInputRef}
        accept="image/jpeg, image/png, image/webp"
        hidden
        isRequired={false}
        onChange={(e) => {
          const file = e.target.files ? e.target.files[0] : null;
          handleFileChange(file);
          e.target.value = '';
        }}
        type="file"
      />
      {/* 点击区域覆盖层 */}
      <Box
        pos="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        cursor="pointer"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      />
    </Box>
  );
};
