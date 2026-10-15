import express from 'express';
import {
  getCollections,
  createCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addItemsToCollection,
} from '../controllers/collectionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCollections)
  .post(createCollection);

router.route('/:id')
  .get(getCollectionById)
  .put(updateCollection)
  .delete(deleteCollection);

router.post('/:id/items', addItemsToCollection);

export default router;
