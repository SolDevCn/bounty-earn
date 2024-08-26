import {
  Avatar,
  AvatarGroup,
  Box,
  Center,
  Divider,
  Flex,
  Icon,
  Image,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { type GetServerSideProps } from 'next';
import NextImage from 'next/image';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { MdCheck } from 'react-icons/md';

import { SponsorButton } from '@/components/ProfileSetup/SponsorButton';
import { TalentButton } from '@/components/ProfileSetup/TalentButton';
import { totalsQuery } from '@/features/home';
import { Default } from '@/layouts/Default';
import { Meta } from '@/layouts/Meta';
import Tensor from '@/public/assets/company-logos/tensor.svg';
import Jupiter from '@/public/assets/landingsponsor/sponsors/jupiter.png';
import Solflare from '@/public/assets/landingsponsor/sponsors/solflare.png';
import Squads from '@/public/assets/landingsponsor/sponsors/squads.png';
import { SponsorStore } from '@/store/sponsor';
import { useUser } from '@/store/user';
import { getURL } from '@/utils/validUrl';

export default function NewProfilePage({
  showTalentProfile,
}: {
  showTalentProfile: boolean;
}) {
  const avatars = [
    {
      name: 'Abhishkek',
      src: '/assets/pfps/t1.png',
    },
    {
      name: 'Pratik',
      src: '/assets/pfps/md2.png',
    },
    {
      name: 'Yash',
      src: '/assets/pfps/fff1.png',
    },
  ];

  const { data: totals } = useQuery(totalsQuery);

  const router = useRouter();
  const { user } = useUser();
  const [isTalentLoading, setIsTalentLoading] = useState(false);
  const [showTalentMessage, setShowTalentMessage] = useState(false);
  const { setCurrentSponsor } = SponsorStore();
  const [isSponsorLoading, setIsSponsorLoading] = useState(false);
  const [showSponsorMessage, setShowSponsorMessage] = useState(false);

  const checkTalent = async () => {
    if (!user || !user?.id) {
      setShowTalentMessage(true);
    } else {
      setShowTalentMessage(false);
      setIsTalentLoading(true);
      try {
        if (!user?.isTalentFilled) {
          router.push('/new/talent');
        } else {
          router.push('/');
        }
      } catch (error) {
        setIsTalentLoading(false);
      }
    }
  };

  const checkSponsor = async () => {
    if (!user || !user?.id) {
      setShowSponsorMessage(true);
    } else {
      setShowSponsorMessage(false);
      setIsSponsorLoading(true);
      try {
        const sponsors = await axios.get('/api/user-sponsors');
        if (sponsors?.data?.length) {
          setCurrentSponsor(sponsors?.data[0]?.sponsor);
          router.push('/dashboard/listings?open=1');
        } else {
          router.push('/new/sponsor');
        }
      } catch (error) {
        setIsSponsorLoading(false);
      }
    }
  };
  return (
    <Default
      meta={
        <Meta
          title="Make Your Profile | Earn on Superteam | Connect with Crypto Talent"
          description="Join Superteam to engage with top talent and discover bounties and grants for your crypto projects."
          canonical="https://earn.superteam.fun/new/"
        />
      }
    >
      <Box
        pos={'relative'}
        display={'flex'}
        maxW="52rem"
        h={{ md: '100vh' }}
        mx="auto"
        fontFamily="var(--font-sans)"
      >
        <Flex
          pos={{ base: 'static', md: 'relative' }}
          top={{ base: 0, md: '10vh' }}
          direction={{ base: 'column', lg: 'row' }}
          gap={{ base: '4rem', md: '2rem' }}
          px={{ base: 4, lg: 0 }}
          py={{ base: 6, lg: 0 }}
        >
          {showTalentProfile && (
            <Flex
              direction={'column'}
              gap={9}
              w="full"
              cursor="pointer"
              onClick={checkTalent}
            >
              <Flex direction={'column'} gap={1.5}>
                <Text color="brand.slate.900" fontSize={'2xl'} fontWeight={600}>
                  Want to Earn?
                </Text>
                <Text
                  color="brand.slate.500"
                  fontSize={'1.125rem'}
                  lineHeight={'21.78px'}
                  letterSpacing="-0.2px"
                >
                  Create a profile to start submitting, and get notified on new
                  work opportunities
                </Text>
              </Flex>

              <Flex
                direction={'column'}
                gap={4}
                overflow="hidden"
                bg={'white'}
                borderRadius={'7px'}
              >
                <Box
                  pos="relative"
                  alignItems={'center'}
                  justifyContent={'center'}
                  display={'flex'}
                  w={'full'}
                >
                  <NextImage
                    width={704}
                    height={328}
                    style={{ width: '100%' }}
                    alt={'user icon'}
                    src={'/assets/onboarding/talent-banner.webp'}
                  />
                  <Box
                    pos="absolute"
                    top={0}
                    left={0}
                    w="full"
                    h="full"
                    bg="#A78BFA"
                    mixBlendMode={'overlay'}
                  />
                </Box>
                <Box flexDir={'column'} gap={5} display={'flex'} px={4}>
                  <BulletPoint type="TALENT">
                    Contribute to top Solana projects
                  </BulletPoint>
                  <BulletPoint type="TALENT">
                    Build your web3 resume
                  </BulletPoint>
                  <BulletPoint type="TALENT">Get paid in crypto</BulletPoint>
                </Box>
                <Divider borderColor="brand.slate.300" />
                <Box px={4} pb={4}>
                  <TalentButton
                    showMessage={showTalentMessage}
                    isLoading={isTalentLoading}
                    checkTalent={checkTalent}
                  />
                </Box>
              </Flex>
              <Flex align="center" gap={6} mx="auto" mt={-3}>
                <AvatarGroup max={3} size={'xs'}>
                  {avatars.map((avatar, index) => (
                    <Avatar
                      key={index}
                      pos="relative"
                      borderWidth={'0px'}
                      name={avatar.name}
                      src={avatar.src}
                    />
                  ))}
                </AvatarGroup>
                {totals?.totalUsers !== null && (
                  <Text pos="relative" color="brand.slate.500" fontSize="sm">
                    Join {totals?.totalUsers?.toLocaleString()}+ others
                  </Text>
                )}
              </Flex>
            </Flex>
          )}
          <Flex
            direction={'column'}
            gap={9}
            w="full"
            cursor="pointer"
            onClick={checkSponsor}
          >
            <Flex direction={'column'} gap={1.5}>
              <Text color="brand.slate.900" fontSize={'2xl'} fontWeight={600}>
                Find Contributors
              </Text>
              <Text
                color="brand.slate.500"
                fontSize={'1.125rem'}
                lineHeight={'21.78px'}
                letterSpacing="-0.2px"
              >
                List a bounty or freelance gig for your project and find your
                next contributor
              </Text>
            </Flex>
            <Flex
              direction={'column'}
              gap={4}
              overflow="hidden"
              bg={'white'}
              borderRadius={'7px'}
            >
              <Box
                pos="relative"
                alignItems={'center'}
                justifyContent={'center'}
                display={'flex'}
                w={'full'}
              >
                <NextImage
                  width={704}
                  height={328}
                  style={{ width: '100%' }}
                  alt={'user icon'}
                  src={'/assets/onboarding/sponsor-banner.webp'}
                />
                <Box
                  pos="absolute"
                  top={0}
                  left={0}
                  w="full"
                  h="full"
                  bg="#10B981"
                  mixBlendMode={'overlay'}
                />
              </Box>
              <Box flexDir={'column'} gap={5} display={'flex'} px={4}>
                <BulletPoint type="SPONSOR">
                  Get in front of 10,000 weekly visitors
                </BulletPoint>
                <BulletPoint type="SPONSOR">
                  20+ templates to choose from
                </BulletPoint>
                <BulletPoint type="SPONSOR">100% free</BulletPoint>
              </Box>
              <Divider borderColor="brand.slate.300" />
              <Box px={4} pb={4}>
                <SponsorButton
                  isLoading={isSponsorLoading}
                  showMessage={showSponsorMessage}
                  checkSponsor={checkSponsor}
                />
              </Box>
            </Flex>
            <Flex align="center" justify="space-between" gap={3} mt={-3} px={3}>
              <Image
                as={NextImage}
                h={'20px'}
                objectFit={'contain'}
                alt="Jupiter Icon"
                src={Jupiter as unknown as string}
              />
              <Image
                as={NextImage}
                h={'34px'}
                objectFit={'contain'}
                alt="Solflare Icon"
                src={Solflare as unknown as string}
              />
              <Image
                as={NextImage}
                display={{ base: 'none', md: 'block' }}
                h={'18px'}
                objectFit={'contain'}
                alt="Squads Icon"
                src={Squads as unknown as string}
              />
              <Image
                as={NextImage}
                w={'28px'}
                h={'28px'}
                objectFit={'contain'}
                alt="Tensor Icon"
                src={Tensor as unknown as string}
              />
            </Flex>
          </Flex>
        </Flex>
      </Box>
    </Default>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, query } = context;
  let showTalentProfile = true;

  try {
    const response = await axios.get(`${getURL()}api/user`, {
      headers: {
        Cookie: req.headers.cookie,
      },
    });

    const { isTalentFilled } = response.data;
    showTalentProfile = isTalentFilled === false;

    if (query.onboarding === 'true' && isTalentFilled) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return {
    props: {
      showTalentProfile,
    },
  };
};

const TickIcon = ({ type }: { type: 'TALENT' | 'SPONSOR' }) => {
  return (
    <Center
      p={'3px'}
      bg={type === 'TALENT' ? '#EEF2FF' : '#ECFDF5'}
      rounded="full"
    >
      <Icon
        as={MdCheck}
        w="0.8rem"
        h="0.8rem"
        color={type === 'TALENT' ? '#4F46E5' : '#059669'}
      />
    </Center>
  );
};

const BulletPoint = ({
  type,
  children,
}: {
  type: 'TALENT' | 'SPONSOR';
  children: React.ReactNode;
}) => {
  return (
    <Flex align={'center'} gap={4}>
      <TickIcon type={type} />
      <Text color={'brand.slate.500'} fontWeight={400}>
        {children}
      </Text>
    </Flex>
  );
};
