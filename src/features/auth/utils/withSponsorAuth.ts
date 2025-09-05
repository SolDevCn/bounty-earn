import { type NextApiHandler, type NextApiResponse } from 'next';

import logger from '@/lib/logger';

import { withAuth, type AuthenticatedRequest } from './withAuth';

type Handler = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
) => void | Promise<void>;

export const withSponsorAuth = (handler: Handler): NextApiHandler => {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { user } = req;

    // 🎯 God绕过机制：God权限可以绕过sponsor权限要求
    if (user.role === 'GOD') {
      logger.debug(`God user bypassing sponsor auth: ${user.id}`);
      return handler(req, res);
    }

    // 普通用户需要有sponsor关联
    if (!user.currentSponsorId) {
      logger.warn('User does not have a current sponsor or is unauthorized');
      return res
        .status(403)
        .json({ error: 'User does not have a current sponsor.' });
    }

    // 为了向后兼容，设置这些字段
    req.userSponsorId = user.currentSponsorId;
    req.role = user.role;

    return handler(req, res);
  });
};
