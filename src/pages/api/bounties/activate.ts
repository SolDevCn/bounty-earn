import type { NextApiResponse } from 'next';

import { withAuth, type AuthenticatedRequest } from '@/features/auth';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';
import { safeStringify } from '@/utils/safeStringify';

async function activateBounty(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  // 🎯 内联God权限检查
  if (req.user.role !== 'GOD') {
    return res.status(403).json({ 
      error: 'Forbidden: God权限 required for bounty activation' 
    });
  }
  const params = req.query;
  const id = params.id as string;

  const { bountyId } = req.body;

  try {
    logger.debug(`Updating bounty with ID: ${id}`);
    const result = await prisma.bounties.update({
      where: { id: bountyId },
      data: {
        isPublished: true,
        status: 'OPEN',
      },
    });

    logger.info(`God activated successfully for Bounty: ${id}`);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error(
      `Error occurred while updating grant with ID: ${id}: ${safeStringify(error)}`,
    );
    return res.status(500).json({
      error: error.message,
      message: `Error occurred while updating grant with id=${id}.`,
    });
  }
}

export default withAuth(activateBounty);
