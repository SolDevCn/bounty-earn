import { Avatar, Flex, Text, Tooltip } from '@chakra-ui/react';
import NextLink from 'next/link';
import React from 'react';

import { OgImageViewer } from '@/components/shared/ogImageViewer';
import { getTwitterUrl, getURLSanitized } from '@/utils/getURLSanitized';

import { type FeedDataProps } from '../types';
import { FeedCardContainer } from './FeedCardContainer';
import { FeedCardLink } from './FeedCardLink';
import { WinnerFeedImage } from './WinnerFeedImage';

interface SubCardProps {
  sub: FeedDataProps;
  type: 'profile' | 'activity';
  commentCount?: number;
}

export function SubmissionCard({ sub, type, commentCount }: SubCardProps) {
  const firstName = sub?.firstName;
  const lastName = sub?.lastName;
  const photo = sub?.photo;
  const username = sub?.username;

  const isProject = sub?.listingType === 'project';
  const hasId = Boolean(sub?.id);
  const isPrivate = Boolean(sub?.isPrivate);
  const isAnnounced = Boolean(sub?.isWinnersAnnounced);
  const hasExternalLink = Boolean(sub?.link);

  const listingLink = `/listings/${sub?.listingType}/${sub?.listingSlug}`;
  const internalDetailLink = `/feed/submission/${sub?.id}`;

  // 链接有效性检查函数
  const isValidUrl = (url: string) => {
    if (!url || url === '#') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  let externalLink: string | undefined;
  if (hasExternalLink) {
    // 检查是否为Twitter/X链接
    const isTwitterLink =
      sub!.link!.includes('twitter.com') ||
      sub!.link!.includes('x.com') ||
      sub!.link!.startsWith('@');

    if (isTwitterLink) {
      externalLink = getTwitterUrl(sub!.link!);
    } else {
      externalLink = getURLSanitized(sub!.link!);
    }

    if (externalLink.length > 2048) {
      externalLink = '#';
    }
  }

  // 文案
  let winningText = '';
  let submissionText = '';
  switch (sub?.listingType) {
    case 'bounty':
      winningText = '赢得一个赏金任务';
      submissionText = '提交一个赏金任务';
      break;
    case 'project':
      winningText = '选择一个定向任务';
      submissionText = '申请了一个定向任务';
      break;
    default:
      submissionText = '提交';
  }

  const content = {
    actionText: sub?.isWinner && isAnnounced ? winningText : submissionText,
    createdAt: sub?.createdAt,
  };

  // 提取变量，减少非空断言
  const rawLink = sub?.link;
  const isTwitter =
    rawLink &&
    (rawLink.includes('twitter.com') ||
      rawLink.includes('x.com') ||
      rawLink.startsWith('@'));
  const validExternal = Boolean(hasExternalLink && rawLink && isValidUrl(rawLink));

  // 统一状态判定
  const shouldHideButton = isProject;
  const shouldDisableButton = !hasId || !isAnnounced;

  // Tooltip仅在禁用时显示
  const disabledTooltip = isPrivate
    ? '此任务为私有，提交不可见'
    : '此提交将在公布获胜者后可见';

  const showLock = shouldDisableButton && isPrivate;

  // 跳转目标逻辑
  let finalHref: string;
  if (shouldDisableButton) {
    finalHref = listingLink; // 统一回任务页
  } else if (hasExternalLink) {
    if (validExternal) {
      finalHref = isTwitter
        ? getTwitterUrl(rawLink!)
        : getURLSanitized(rawLink!);
    } else {
      finalHref = internalDetailLink; // 降级
    }
  } else {
    finalHref = internalDetailLink;
  }

  const actionLinks = (
    <>
      <Flex align="center" gap={3}>
        <Avatar size="xs" src={sub?.sponsorLogo} />
        <Text
          as={NextLink}
          overflow="hidden"
          color="brand.slate.500"
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight={600}
          _hover={{ textDecoration: 'underline' }}
          textOverflow="ellipsis"
          href={listingLink}
          noOfLines={1}
        >
          {sub?.listingTitle}
        </Text>
      </Flex>

      {!shouldHideButton && (
        <FeedCardLink
          href={finalHref}
          style={{
            opacity: shouldDisableButton ? 0.5 : 1,
            pointerEvents: shouldDisableButton ? 'none' : 'auto',
            cursor: shouldDisableButton ? 'not-allowed' : 'pointer',
          }}
          openInNewTab={
            !shouldDisableButton && hasExternalLink && validExternal
          }
        >
          <Tooltip
            px={4}
            py={2}
            color="brand.slate.500"
            fontFamily="var(--font-sans)"
            bg="white"
            borderRadius="lg"
            isDisabled={!shouldDisableButton}
            label={disabledTooltip}
          >
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {showLock ? <span aria-hidden>🔒</span> : null}
              浏览提交
            </span>
          </Tooltip>
        </FeedCardLink>
      )}
    </>
  );

  return (
    <FeedCardContainer
      content={content}
      actionLinks={actionLinks}
      type={type}
      firstName={firstName}
      lastName={lastName}
      photo={photo}
      username={username}
      id={sub?.id}
      like={sub?.like}
      commentLink={listingLink}
      cardType="submission"
      link={listingLink}
      userId={sub?.userId}
      commentCount={commentCount || sub.commentCount}
      recentCommenters={sub?.recentCommenters}
    >
      {sub?.isWinner && isAnnounced ? (
        <WinnerFeedImage
          token={sub?.token}
          rewards={sub?.rewards}
          winnerPosition={sub?.winnerPosition}
        />
      ) : (
        <OgImageViewer
          externalUrl={sub?.link ?? ''}
          w="full"
          h={{ base: '200px', md: '350px' }}
          objectFit="cover"
          borderTopRadius={6}
          imageUrl={sub?.ogImage}
          type="submission"
          id={sub?.id}
        />
      )}
    </FeedCardContainer>
  );
}
