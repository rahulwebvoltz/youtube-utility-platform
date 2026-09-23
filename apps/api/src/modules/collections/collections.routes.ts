import { Router } from 'express';
import { z } from 'zod';
import {
  addCollectionItemSchema,
  createCollectionSchema,
  updateCollectionSchema,
} from '@ytp/validators';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import {
  addItemToCollection,
  createCollection,
  deleteCollectionForUser,
  getCollectionForUser,
  listCollectionsForUser,
  listItemsWithDetails,
  removeItemFromCollection,
  toPublicCollection,
  updateCollectionForUser,
} from '@/modules/collections/collections.service.js';

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

const idParamSchema = z.object({ id: z.string().min(1) });
const itemIdParamSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1) });

collectionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const collections = await listCollectionsForUser(getUserId(req));
    res.json({ success: true, data: collections.map(toPublicCollection) });
  }),
);

collectionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description } = createCollectionSchema.parse(req.body);
    const collection = await createCollection(getUserId(req), name, description);
    res.status(201).json({ success: true, data: toPublicCollection(collection) });
  }),
);

collectionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const [collection, items] = await Promise.all([
      getCollectionForUser(id, getUserId(req)),
      listItemsWithDetails(id, getUserId(req)),
    ]);
    res.json({ success: true, data: { collection: toPublicCollection(collection), items } });
  }),
);

collectionsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const patch = updateCollectionSchema.parse(req.body);
    const collection = await updateCollectionForUser(id, getUserId(req), patch);
    res.json({ success: true, data: toPublicCollection(collection) });
  }),
);

collectionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await deleteCollectionForUser(id, getUserId(req));
    res.json({ success: true, data: { deleted: true } });
  }),
);

collectionsRouter.post(
  '/:id/items',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { itemType, refId } = addCollectionItemSchema.parse(req.body);
    const item = await addItemToCollection(id, getUserId(req), itemType, refId);
    res.status(201).json({
      success: true,
      data: { id: item._id.toString(), itemType: item.itemType, refId: item.refId },
    });
  }),
);

collectionsRouter.delete(
  '/:id/items/:itemId',
  asyncHandler(async (req, res) => {
    const { id, itemId } = itemIdParamSchema.parse(req.params);
    await removeItemFromCollection(id, getUserId(req), itemId);
    res.json({ success: true, data: { removed: true } });
  }),
);
