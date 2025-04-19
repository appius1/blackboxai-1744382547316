import { Router } from 'express';
import { 
  register,
  login,
  setup2FA,
  disable2FA
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - tenantId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               tenantId:
 *                 type: string
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               twoFactorToken:
 *                 type: string
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Setup 2FA for user
 *     security:
 *       - bearerAuth: []
 */
router.post('/2fa/setup', authenticate, setup2FA);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable 2FA for user
 *     security:
 *       - bearerAuth: []
 */
router.post('/2fa/disable', authenticate, disable2FA);

export default router;
