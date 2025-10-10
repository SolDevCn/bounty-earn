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

    // 🎯 GOD权限绕过机制 - GOD用户可以绕过所有sponsor权限要求
    if (user.role === 'GOD') {
      logger.debug(`God user bypassing sponsor auth: ${user.id}`);
      // 为GOD用户设置兼容字段，确保后续逻辑正常工作
      req.userSponsorId = user.currentSponsorId || 'god-bypass';
      req.role = 'GOD';
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
