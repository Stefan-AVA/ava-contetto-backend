import { IUser } from '@/types/user.types';
import type { Request, Response, NextFunction } from 'express';
import { ObjectId, WithoutId } from 'mongodb';

import { db } from '@/database';
import { IFolder } from '@/types/folder.types';

const foldersCol = db.collection<WithoutId<IFolder>>('folders');

export const folderAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentProfile = req.agentProfile;
    const contact = req.contact;

    const { folderId: pfId } = req.params;
    const { folderId: qfId } = req.query;
    const { folderId: bfId } = req.body;

    const folderId = pfId || qfId || bfId;
    if (folderId) {
      const folder = await foldersCol.findOne({
        _id: new ObjectId(folderId),
        orgId: (agentProfile?.orgId || contact?.orgId)!,
        connections: {
          $elemMatch: {
            $or: [
              ...(agentProfile
                ? [
                    { id: undefined, type: 'shared' },
                    { id: agentProfile._id, type: 'agent' },
                  ]
                : []),
              ...(contact ? [{ id: contact._id, type: { $in: ['contact', 'forAgentOnly'] } }] : []),
            ],
          },
        },
      });

      if (!folder) {
        return res.status(404).json({ msg: 'not found folder' });
      }

      req.folder = folder;
    }

    await next();
  } catch (error) {
    console.log('agentOrContact error ===>', error);
    return res.status(500).json({ msg: 'Server error' });
  }
};
