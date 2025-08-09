import { Box, Show, Text } from '@chakra-ui/react';
import Image from 'next/image';
import React from 'react';

import MobileBanner from '@/public/assets/home/display/sign-banner-mobile.jpg';
import DesktopBanner from '@/public/assets/home/display/sign-banner.jpg';

export function HomeBanner() {
  return (
    <Box
      pos="relative"
      w={'100%'}
      h={{ base: '260', md: '280' }}
      maxH={'500px'}
      mx={'auto'}
      my={3}
      p={{ base: '5', md: '10' }}
      rounded={'md'}
    >
      <Show above="sm">
        <Image
          src={DesktopBanner}
          alt=""
          layout="fill"
          objectFit="cover"
          quality={95}
          priority
          loading="eager"
          sizes="70vw"
          style={{
            width: '100%',
            maxWidth: '100%',
            borderRadius: 'var(--chakra-radii-md)',
            pointerEvents: 'none',
          }}
        />
      </Show>

      <Show below="sm">
        <Image
          src={MobileBanner}
          alt=""
          layout="fill"
          objectFit="cover"
          quality={95}
          priority
          loading="eager"
          sizes="100vw"
          style={{
            width: '100%',
            maxWidth: '100%',
            borderRadius: 'var(--chakra-radii-md)',
          }}
        />
      </Show>
      <Box
        pos="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={1}
        textAlign="center"
        w="100%"
        px={4}
      >
        <Text
          color="white"
          fontSize={{ base: '2xl', md: '25px' }}
          fontWeight={'700'}
          lineHeight={'120%'}
          textShadow="0 2px 4px rgba(0,0,0,0.8)"
        >
          为你的 Solana 项目发掘人才
        </Text>
      </Box>
    </Box>
  );
}
