import { CloseIcon } from '@chakra-ui/icons';
import {
  AbsoluteCenter,
  Box,
  Container,
  Modal,
  ModalCloseButton,
  ModalContent,
  Text,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Pride from 'react-canvas-confetti/dist/presets/pride';
import { type TDecorateOptionsFn } from 'react-canvas-confetti/dist/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isProject: boolean;
}

const decorateOptions: TDecorateOptionsFn = (options) => {
  const colors = [
    '#E63946',
    '#F1FAEE',
    '##A8DADC',
    '#457B9D',
    '#1D3557',
    '#F4A261',
    '#E9C46A',
    '#2A9D8F',
    '#FF5733',
    '#FF2400',
    '#FFC0CB',
  ];
  const selectedColors: string[] = [];

  while (selectedColors.length < 5) {
    const randomIndex = Math.floor(Math.random() * colors.length);
    const color = colors[randomIndex];
    if (!selectedColors.includes(color!)) {
      selectedColors.push(color!);
    }
  }

  return {
    ...options,
    particleCount: 20,
    colors: selectedColors,
  };
};

export const EasterEgg = ({ isOpen, onClose, isProject }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle audio playback only after user interaction
  useEffect(() => {
    if (isOpen && hasUserInteracted && audioRef.current) {
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
        } catch (error) {
          console.log('Audio autoplay prevented:', error);
        }
      };
      playAudio();
    }

    // Cleanup: pause audio when modal closes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isOpen, hasUserInteracted]);

  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
  };

  return (
    <Modal
      blockScrollOnMount={true}
      closeOnEsc={true}
      closeOnOverlayClick={false} // Prevent accidental close
      isCentered // Allow ESC key to close
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalContent
        pos="fixed"
        top="0"
        left="0"
        w="100vw"
        maxW="none"
        h="100vh"
        mt="0"
        mb="0"
        bg="#5243FF"
        borderRadius={0}
        onClick={handleUserInteraction} // Track user interaction for audio
      >
        {/* Only run confetti animation when modal is open to save resources */}
        {isOpen && (
          <Pride
            autorun={{ speed: 10, duration: 3000 }} // Limit duration to 3 seconds
            decorateOptions={decorateOptions}
          />
        )}
        <ModalCloseButton zIndex={10} w={6} h={6} m={4} color="white">
          <CloseIcon width={4} height={4} />
        </ModalCloseButton>
        <Container mt={[28, 6]} px={4}>
          <Box w="112px" mx="auto" mt="24px" mb="44px">
            <Image
              src="/assets/icons/celebration.png"
              alt="celebration icon"
              width="100"
              height="100"
            />
          </Box>
          <Text
            color="white"
            fontSize={[42, 58]}
            fontWeight={500}
            lineHeight="1"
            textAlign="center"
          >
            {isProject ? '项目' : '提案'} 成功提交！
          </Text>
          <Text
            mt={[8, 5]}
            color="white"
            fontSize={[38, 48]}
            lineHeight="1"
            textAlign="center"
            opacity="0.6"
          >
            海绵宝宝发来贺电💃 💃
          </Text>
        </Container>
        <AbsoluteCenter
          bottom="0"
          alignItems="center"
          flexDir="column"
          display="flex"
          w={['150%', '100%', '100%', '50%']}
          h="auto"
          mx="auto"
          mt="auto"
          transform="translate(-50%,0%)"
        >
          <Image
            src="/assets/memes/jiesuan.gif"
            alt="结算动画"
            width="500"
            height="600"
            priority
            loading="eager"
            quality={80}
          />
        </AbsoluteCenter>
        <audio
          ref={audioRef}
          src="/assets/memes/jiesuan.mp3"
          style={{ display: 'none' }}
          loop
          preload="metadata" // Only preload metadata, not the entire file
        />
      </ModalContent>
    </Modal>
  );
};
