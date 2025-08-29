import { ArrowForwardIcon } from '@chakra-ui/icons';
import {
  LinkBox,
  type LinkBoxProps,
  LinkOverlay,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import * as React from 'react';

type Props = {
  href?: string;
  style?: LinkBoxProps;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
  /** 即使是站内链接也在新标签打开（用于 S5 场景） */
  openInNewTab?: boolean;
};

export const FeedCardLink: React.FC<Props> = ({
  href,
  style,
  children,
  onClick,
  openInNewTab = false,
}) => {
  const isInternalLink = React.useMemo(() => {
    if (!href) return false;
    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../'))
      return true;

    // SSR时，假设绝对URL都是外链
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const u = new URL(href, window.location.origin);
      return u.origin === window.location.origin;
    } catch {
      return false;
    }
  }, [href]);

  const safeHref = href ?? '#';
  const forceBlank = openInNewTab;

  return (
    <LinkBox
      alignItems="center"
      gap={2}
      display="flex"
      whiteSpace="nowrap"
      {...style}
    >
      {isInternalLink && !forceBlank ? (
        <NextLink href={safeHref} passHref legacyBehavior>
          <LinkOverlay onClick={onClick}>
            <Text
              as="span"
              color="#6366F1"
              fontSize={{ base: 'sm', md: 'md' }}
              fontWeight={600}
            >
              {children}
            </Text>
          </LinkOverlay>
        </NextLink>
      ) : (
        <LinkOverlay
          href={safeHref}
          onClick={onClick}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Text
            as="span"
            color="#6366F1"
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight={600}
          >
            {children}
          </Text>
        </LinkOverlay>
      )}
      <ArrowForwardIcon color="#6366F1" />
    </LinkBox>
  );
};
