import type { NextApiResponse } from 'next';

import { withAuth, type AuthenticatedRequest } from '@/features/auth';
import logger from '@/lib/logger';
import { prisma } from '@/prisma';

async function activateSponsor(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  // 🎯 内联God权限检查
  if (req.user.role !== 'GOD') {
    return res.status(403).json({ 
      error: 'Forbidden: God权限 required for sponsor activation' 
    });
  }
  try {
    const { sponsorId } = req.body;

    if (!sponsorId) {
      logger.warn('Invalid sponsor ID');
      return res.status(400).json({ error: 'Invalid sponsor ID' });
    }

    // update sponsor is active to true
    const result = await prisma.sponsors.update({
      where: {
        id: sponsorId,
      },
      data: {
        isActive: true,
      },
    });

    logger.info(`God activated successfully for sponsor: ${sponsorId}`);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error occurred while activating sponsor: ${error.message}`);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      message: 'Error occurred while activating sponsor.',
    });
  }
}

export default withAuth(activateSponsor);
