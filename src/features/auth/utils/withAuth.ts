import { type NextApiHandler, type NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/prisma';
import { type NextApiRequestWithUser } from '../types';

export interface AuthenticatedRequest extends NextApiRequestWithUser {
  user: {
    id: string;
    role: string;
    currentSponsorId: string | null;
    UserSponsors: Array<{
      sponsorId: string;
      role: 'ADMIN' | 'MEMBER';
    }>;
  };
  // 向后兼容字段
  userSponsorId?: string | null;
  role?: string;
}

type Handler = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
) => void | Promise<void>;

export const withAuth = (handler: Handler): NextApiHandler => {
  return async (req: any, res: NextApiResponse) => {
    const token = await getToken({ req });

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = token.sub;
    if (!userId) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          currentSponsorId: true,
          UserSponsors: {
            select: {
              sponsorId: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      req.userId = userId;
      req.user = user;
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
