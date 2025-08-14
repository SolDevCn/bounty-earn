import { Flex, Spinner, Text, useTheme } from '@chakra-ui/react';
import React from 'react';

import { useGlobalLoading } from '@/store/loading';

interface GlobalLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  overlay?: boolean;
}

export function GlobalLoading({ 
  size = 'md', 
  text = '加载中...', 
  overlay = false 
}: GlobalLoadingProps) {
  const { globalLoading } = useGlobalLoading();
  const theme = useTheme();

  if (!globalLoading) return null;

  const sizeMap = {
    sm: { spinner: 'xs', text: 'sm' },
    md: { spinner: 'md', text: 'md' },
    lg: { spinner: 'lg', text: 'lg' },
  };

  const loadingContent = (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={2}
      p={4}
    >
      <Spinner
        size={sizeMap[size].spinner as any}
        thickness="3px"
        speed="0.65s"
        emptyColor="gray.200"
        color={theme.colors.brand.purple}
      />
      <Text 
        fontSize={sizeMap[size].text}
        color="gray.600"
        fontWeight="500"
      >
        {text}
      </Text>
    </Flex>
  );

  if (overlay) {
    return (
      <Flex
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="rgba(255, 255, 255, 0.8)"
        backdropFilter="blur(2px)"
        zIndex={9999}
        align="center"
        justify="center"
      >
        {loadingContent}
      </Flex>
    );
  }

  return loadingContent;
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'brand.purple',
  text 
}: LoadingSpinnerProps) {
  const theme = useTheme();
  const sizeMap = {
    sm: { spinner: 'xs', text: 'xs' },
    md: { spinner: 'md', text: 'sm' },
    lg: { spinner: 'lg', text: 'md' },
  };

  return (
    <Flex direction="column" align="center" gap={2}>
      <Spinner
        size={sizeMap[size].spinner as any}
        thickness="3px"
        speed="0.65s"
        emptyColor="gray.200"
        color={theme.colors[color as keyof typeof theme.colors] || color}
      />
      {text && (
        <Text fontSize={sizeMap[size].text} color="gray.600">
          {text}
        </Text>
      )}
    </Flex>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingOverlay({ 
  isLoading, 
  text = '加载中...', 
  size = 'md' 
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <Flex
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(255, 255, 255, 0.9)"
      backdropFilter="blur(1px)"
      zIndex={100}
      align="center"
      justify="center"
      borderRadius="inherit"
    >
      <LoadingSpinner size={size} text={text} />
    </Flex>
  );
}

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  retryText = '重试' 
}: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <Flex direction="column" align="center" gap={3} p={4}>
      <Text color="red.500" fontSize="sm" textAlign="center">
        {error}
      </Text>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {retryText}
        </button>
      )}
    </Flex>
  );
}