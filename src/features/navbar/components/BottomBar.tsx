import { Box, Button, Flex, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { LuNewspaper, LuSearch, LuUser } from 'react-icons/lu';

import { AuthWrapper } from '@/features/auth';
import { HomeIcon } from '@/features/feed';
import { useUser } from '@/store/user';

interface Props {
  onSearchOpen: () => void;
}

export function BottomBar({ onSearchOpen }: Props) {
  const { user } = useUser();
  const router = useRouter();

  function setColor(href: string, routerPath: string) {
    if (routerPath === href) return 'brand.purple';
    else return 'brand.slate.400';
  }

  const iconStyle = { width: '1.5rem', height: '1.5rem' };

  return (
    <Flex
      justify="space-between"
      display={{ base: 'flex', lg: 'none' }}
      w="full"
      px={4}
      py={2}
      bg="white"
      borderTopWidth={1}
      borderTopColor="brand.slate.200"
    >
      <NextLink href="/" passHref legacyBehavior>
        <Link>
          <Button
            sx={{
              WebkitTapHighlightColor: 'transparent',
            }}
            color={setColor('/', router.asPath)}
            _hover={{ bg: 'none' }}
            _active={{ bg: 'none' }}
            variant="ghost"
          >
            <HomeIcon />
          </Button>
        </Link>
      </NextLink>
      <Button
        sx={{
          WebkitTapHighlightColor: 'transparent',
        }}
        color={setColor('/search', router.pathname)}
        _hover={{ bg: 'none' }}
        _active={{ bg: 'none' }}
        onClick={() => onSearchOpen()}
        variant="ghost"
      >
        <LuSearch style={iconStyle} />
      </Button>
      <NextLink href="/feed/" passHref legacyBehavior>
        <Link>
          <Button
            sx={{
              WebkitTapHighlightColor: 'transparent',
            }}
            pos="relative"
            color={setColor('/feed/', router.asPath)}
            _hover={{ bg: 'none' }}
            _active={{ bg: 'none' }}
            variant="ghost"
          >
            <LuNewspaper style={iconStyle} />
            <Box
              pos="absolute"
              top={1}
              right={3}
              w={2.5}
              h={2.5}
              bg="red"
              rounded="full"
            />
          </Button>
        </Link>
      </NextLink>
      <AuthWrapper>
        <NextLink href={`/t/${user?.username}`} passHref legacyBehavior>
          <Link pointerEvents={user ? 'auto' : 'none'}>
            <Button
              sx={{
                WebkitTapHighlightColor: 'transparent',
              }}
              color={setColor(`/t/${user?.username}/`, router.asPath)}
              _hover={{ bg: 'none' }}
              _active={{ bg: 'none' }}
              variant="ghost"
            >
              <LuUser style={iconStyle} />
            </Button>
          </Link>
        </NextLink>
      </AuthWrapper>
    </Flex>
  );
}
