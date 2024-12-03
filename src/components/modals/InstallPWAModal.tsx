/**
 * PWA安装提示模态框组件
 * 用于引导用户将网页应用安装到移动设备主屏幕
 */

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { MdIosShare, MdOutlineInstallMobile } from 'react-icons/md';

import { useUser } from '@/store/user';

/**
 * PWA安装提示事件接口
 * 扩展标准Event接口，添加PWA安装相关方法
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * 手动安装指引组件
 * 用于iOS设备，显示如何通过浏览器菜单安装PWA
 */
const ManualInstructions = () => (
  <Box mb={8} py={2} borderRadius={4} bgColor="brand.slate.100">
    <Text align="center">
      点击图标(
      <Icon as={MdIosShare} mr={1} color="brand.purple" fontWeight={600} />
      或 <Icon as={BsThreeDotsVertical} color="brand.purple" />)
      然后选择"添加到主屏幕"选项。
    </Text>
  </Box>
);

/**
 * PWA安装模态框组件
 * 功能：
 * 1. 检测设备操作系统类型
 * 2. 根据不同设备提供相应的安装指引
 * 3. 自动处理PWA安装事件
 * 4. 管理安装状态的本地存储
 */
export const InstallPWAModal = () => {
  const { user } = useUser();
  // 记录设备操作系统类型
  const [mobileOs, setMobileOs] = useState<'Android' | 'iOS' | 'Other'>(
    'Other',
  );

  // 模态框状态管理
  const {
    isOpen: isPWAModalOpen,
    onClose: onPWAModalClose,
    onOpen: onPWAModalOpen,
  } = useDisclosure();

  // 存储PWA安装提示事件
  const installPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  /**
   * 监听PWA安装提示事件
   * 捕获并存储安装提示事件，以便后续触发
   */
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      installPrompt.current = e;
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );
    };
  }, []);

  /**
   * 执行PWA安装
   * 触发安装提示并记录安装状态
   */
  const installApp = async () => {
    if (installPrompt.current) {
      const { outcome } = await installPrompt.current.prompt();
      if (outcome === 'accepted') {
        localStorage.setItem('isAppInstalled', 'true');
      }
    }
    onPWAModalClose();
  };

  /**
   * 获取移动设备操作系统类型
   * 通过User Agent判断是Android还是iOS
   */
  const getMobileOS = (): 'Android' | 'iOS' | 'Other' => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    return 'Other';
  };

  /**
   * 控制PWA安装模态框的显示时机
   * 根据以下条件决定是否显示：
   * 1. 是移动设备
   * 2. 不是已安装的PWA
   * 3. 之前未显示过
   * 4. 未安装过
   */
  useEffect(() => {
    const showInstallAppModal = () => {
      const modalShown = localStorage.getItem('installAppModalShown');
      const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        document.referrer.includes('android-app://') ||
        (window.navigator as any).standalone;
      const isInstalled = localStorage.getItem('isAppInstalled');
      const os = getMobileOS();
      setMobileOs(os);

      if (os !== 'Other' && !isPWA && !modalShown && !isInstalled) {
        localStorage.setItem('installAppModalShown', 'true');
        onPWAModalOpen();
      }
    };

    // 延迟10秒显示安装提示
    setTimeout(showInstallAppModal, 10000);
  }, [user, onPWAModalOpen]);

  // 判断是否支持自动安装（非iOS设备）
  const isAutoInstallable = mobileOs !== 'iOS';

  return (
    <Modal isOpen={isPWAModalOpen} onClose={onPWAModalClose}>
      <ModalOverlay />
      <ModalContent alignSelf="flex-end" mb={0}>
        {/* 模态框标题 */}
        <ModalHeader borderBottom="1px" borderBottomColor="brand.slate.300">
          <HStack>
            <Icon as={MdOutlineInstallMobile} color={'brand.slate.500'} />
            <Text fontSize={'lg'}>安装 Solar Earn</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton mt={{ base: 2, md: 3 }} />
        {/* 模态框内容 */}
        <ModalBody>
          <VStack alignItems={'center'} my={4}>
            <Flex align={'center'} direction={'column'} mt={10}>
              {/* 应用图标 */}
              <Image
                src={'/android-chrome-512x512.png'}
                alt="Solar Earn Icon"
                height={63}
                width={63}
              />
              {/* 安装说明 */}
              <Flex align={'center'} direction={'column'} my={12}>
                <Text fontWeight={700}>不错过任何新的赏金任务</Text>
                <Text w="75%" mt={1} color="brand.slate.500" textAlign="center">
                  将 Solar Earn 添加到主屏幕，并随时更新。
                </Text>
              </Flex>
              {/* 根据设备类型显示不同的安装方式 */}
              {isAutoInstallable ? (
                <Button w={'full'} mt={4} onClick={installApp}>
                  添加到主屏幕
                </Button>
              ) : (
                <ManualInstructions />
              )}
            </Flex>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
