/**
 * 实体名称更新模态框组件
 * 用于项目方更新其实体（公司/组织/个人）名称
 */

import {
  Button,
  HStack,
  Input,
  Link,
  Modal,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import NextLink from 'next/link';
import { useState } from 'react';

import { PDTG, TERMS_OF_USE } from '@/constants';
import { useUser } from '@/store/user';

/**
 * EntityNameModal组件
 * @param {object} props - 组件属性
 * @param {boolean} props.isOpen - 控制模态框显示状态
 * @param {() => void} props.onClose - 关闭模态框的回调函数
 * 
 * 功能：
 * 1. 提供实体名称更新界面
 * 2. 支持输入验证和错误提示
 * 3. 与后端API交互更新名称
 * 4. 提供帮助文档链接
 */
export const EntityNameModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  // 状态管理
  const [entityName, setEntityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // 获取用户信息及更新函数
  const { user, refetchUser } = useUser();
  if (!user?.currentSponsor?.id) return null;

  /**
   * 更新实体名称
   * 向后端API发送更新请求，成功后刷新用户信息并关闭模态框
   */
  const setDBEntityName = async () => {
    setLoading(true);
    try {
      if (user.currentSponsor) {
        await axios.post('/api/sponsors/edit', {
          entityName,
        });
        await refetchUser();
        onClose();
      }
    } catch (e) {
      console.log('unable to set entity name ', e);
      setError(true);
    }
    setLoading(false);
  };

  return (
    <Modal
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <ModalOverlay />
      <ModalContent gap={6} overflow="hidden" p={6} rounded="lg">
        {/* 标题和说明文本 */}
        <VStack align="start">
          <Text fontSize="lg" fontWeight={500}>
            更新实体名称
          </Text>
          <Text color="brand.slate.400" fontSize="sm">
            根据我们更新后的
            {' '}
            <Link
              textDecoration={'underline'}
              href={TERMS_OF_USE}
              rel="noopener noreferrer"
              target="_blank"
              textUnderlineOffset={2}
            >
              使用条款，
            </Link>
            we need to know the name of the entity that controls your project.
            If you are a DAO, please mention the name of your DAO. If you{' '}
            {"don't "}
            have an entity, please mention your full name.
          </Text>
        </VStack>
        {/* 实体名称输入框 */}
        <Input
          onChange={(e) => setEntityName(e.target.value)}
          placeholder=""
          value={entityName}
        />
        {/* 操作按钮组 */}
        <HStack>
          <Link
            as={NextLink}
            w="full"
            href={PDTG}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button w="full" variant="outline">
              需要帮助？
            </Button>
          </Link>
          <Button w="full" isLoading={loading} onClick={setDBEntityName}>
            更新
          </Button>
        </HStack>
        {/* 错误提示 */}
        {error && (
          <Text color="red" textAlign="center">
            发生错误，请稍后重试
          </Text>
        )}
      </ModalContent>
    </Modal>
  );
};
