import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { asyncHandler } from '../middleware/error';
import { generateTwoFactorSecret, verifyTwoFactorToken } from '../utils/twoFactor';

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  tenantId: z.string(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  twoFactorToken: z.string().optional(),
});

export const register = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, firstName, lastName, tenantId } = registerSchema.parse(req.body);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      tenantId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
    },
  });

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );

  res.status(201).json({
    status: 'success',
    data: {
      user,
      token,
    },
  });
});

export const login = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, twoFactorToken } = loginSchema.parse(req.body);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check 2FA if enabled
  if (user.twoFactorAuth) {
    if (!twoFactorToken) {
      throw new AppError('2FA token required', 401);
    }

    const isTokenValid = verifyTwoFactorToken(user.twoFactorKey!, twoFactorToken);
    if (!isTokenValid) {
      throw new AppError('Invalid 2FA token', 401);
    }
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      token,
    },
  });
});

export const setup2FA = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const secret = generateTwoFactorSecret();

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorAuth: true,
      twoFactorKey: secret.base32,
    },
  });

  res.json({
    status: 'success',
    data: {
      secret: secret.base32,
      qrCode: secret.qr,
    },
  });
});

export const disable2FA = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorAuth: false,
      twoFactorKey: null,
    },
  });

  res.json({
    status: 'success',
    message: '2FA disabled successfully',
  });
});
