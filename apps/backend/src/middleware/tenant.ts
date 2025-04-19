import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from './error';

// Extend Express Request type to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        schemaName: string;
      };
    }
  }
}

const prisma = new PrismaClient();

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get tenant identifier from header or subdomain
    const tenantId = req.headers['x-tenant-id'] as string || 
                    req.hostname.split('.')[0];

    if (!tenantId) {
      return next(new AppError('Tenant identifier not provided', 400));
    }

    // Find tenant in database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        schemaName: true,
      },
    });

    if (!tenant) {
      return next(new AppError('Tenant not found', 404));
    }

    // Attach tenant info to request
    req.tenant = tenant;

    // Set Prisma to use tenant's schema
    // Note: This assumes you're using Prisma's multi-schema feature
    await prisma.$executeRawUnsafe(`SET search_path TO "${tenant.schemaName}"`);

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to ensure tenant is present
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return next(new AppError('Tenant context required', 400));
  }
  next();
};

// Helper to get current tenant
export const getCurrentTenant = (req: Request) => {
  if (!req.tenant) {
    throw new AppError('Tenant context not available', 400);
  }
  return req.tenant;
};
