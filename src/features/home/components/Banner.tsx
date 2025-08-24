import { Box, Show, Text } from '@chakra-ui/react';
import Image from 'next/image';
import React from 'react';

import DesktopBanner from '@/public/assets/home/display/sign-banner.jpg';
import MobileBanner from '@/public/assets/home/display/sign-banner-mobile.jpg';

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
      <Text
        pos="relative"
        zIndex={1}
        maxW={{ base: '70%', md: '100%' }}
        color="white"
        fontSize={{ base: 'xl', md: '25px' }}
        fontWeight={'700'}
        lineHeight={'120%'}
      >
        为你的Solana项目发掘人才
        <br />
      </Text>
      <Text
        pos="relative"
        zIndex={1}
        maxW={{ base: '100%', md: '30rem' }}
        mt={{ base: '2', md: '2' }}
        color={'white'}
        fontSize={{ base: '13px', md: 'lg' }}
        lineHeight={'130%'}
      >
        Solar华语区人才网络
      </Text>
    </Box>
  );
}
