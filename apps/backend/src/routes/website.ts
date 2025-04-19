import { Router } from 'express';
import {
  createWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
  updatePage,
} from '../controllers/website.controller';
import { authenticate } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate, requireTenant);

/**
 * @swagger
 * /websites:
 *   post:
 *     tags: [Websites]
 *     summary: Create a new website
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - template
 *             properties:
 *               name:
 *                 type: string
 *               template:
 *                 type: string
 *               domain:
 *                 type: string
 */
router.post('/', createWebsite);

/**
 * @swagger
 * /websites:
 *   get:
 *     tags: [Websites]
 *     summary: Get all websites for current tenant
 *     security:
 *       - bearerAuth: []
 */
router.get('/', getWebsites);

/**
 * @swagger
 * /websites/{id}:
 *   get:
 *     tags: [Websites]
 *     summary: Get a specific website
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', getWebsite);

/**
 * @swagger
 * /websites/{id}:
 *   patch:
 *     tags: [Websites]
 *     summary: Update a website
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               template:
 *                 type: string
 *               domain:
 *                 type: string
 *               published:
 *                 type: boolean
 */
router.patch('/:id', updateWebsite);

/**
 * @swagger
 * /websites/{id}:
 *   delete:
 *     tags: [Websites]
 *     summary: Delete a website
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', deleteWebsite);

/**
 * @swagger
 * /websites/{websiteId}/pages/{pageId}:
 *   patch:
 *     tags: [Websites]
 *     summary: Update a page
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               content:
 *                 type: object
 *               meta:
 *                 type: object
 */
router.patch('/:websiteId/pages/:pageId', updatePage);

export default router;
