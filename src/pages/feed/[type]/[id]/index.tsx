import { type GetServerSideProps } from 'next';
import { z } from 'zod';

import {
  FeedPost,
  type FeedPostType,
  FeedPostTypeSchema,
} from '@/features/feed';

interface Props {
  type?: FeedPostType | null;
  id?: string | null;
}

export default function FeedPostPage({ type, id }: Props) {
  // 宽容渲染：参数非法也能渲染（见第 3 步的客户端兜底）
  return <FeedPost type={type ?? undefined} id={id ?? undefined} />;
}

// 更宽松：既接受 v4 UUID，也接受常见安全 ID 形态（ULID/CUID/短 ID）
const IdSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^[0-9a-zA-Z._~-]{8,}$/), // 至少 8 位，允许常见 slug/path 片段
]);

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const rawType = typeof params?.type === 'string' ? params?.type : null;
  const rawId = typeof params?.id === 'string' ? params?.id : null;

  const typeOk = !!(rawType && FeedPostTypeSchema.safeParse(rawType).success);
  const idOk = !!(rawId && IdSchema.safeParse(rawId).success);

  // ✅ 软处理：只要有一个非法，就回到 /feed（避免“URL 变了但页面像没动”的观感）
  if (!typeOk || !idOk) {
    return { redirect: { destination: '/feed', permanent: false } };
  }

  return {
    props: {
      type: rawType,
      id: rawId,
    },
  };
};
