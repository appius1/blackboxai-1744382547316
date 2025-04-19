import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { AppError } from '../middleware/error';
import { CloudflareService } from '../services/cloudflare';
import { getCurrentTenant } from '../middleware/tenant';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Validation schemas
const createWebsiteSchema = z.object({
  name: z.string().min(3),
  template: z.string(),
  domain: z.string().optional(),
});

const updateWebsiteSchema = z.object({
  name: z.string().min(3).optional(),
  template: z.string().optional(),
  domain: z.string().optional(),
  published: z.boolean().optional(),
});

const updatePageSchema = z.object({
  name: z.string().min(3).optional(),
  content: z.record(z.any()).optional(),
  meta: z.record(z.any()).optional(),
});

export const createWebsite = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);
  const { name, template, domain } = createWebsiteSchema.parse(req.body);

  // Check if domain is available
  if (domain) {
    const existingDomain = await prisma.website.findUnique({
      where: { domain },
    });

    if (existingDomain) {
      throw new AppError('Domain is already in use', 400);
    }
  }

  // Create website
  const website = await prisma.website.create({
    data: {
      name,
      template,
      domain,
      tenantId: tenant.id,
      pages: {
        create: [
          {
            name: 'Home',
            slug: 'home',
            content: {
              blocks: [],
            },
            meta: {
              title: name,
              description: `Welcome to ${name}`,
            },
          },
        ],
      },
    },
    include: {
      pages: true,
    },
  });

  // If domain is provided, set up DNS and SSL
  if (domain) {
    try {
      await CloudflareService.setupDomain(domain, process.env.APP_IP!);
    } catch (error) {
      logger.error(`Failed to setup domain ${domain}:`, error);
      // Don't fail the website creation if domain setup fails
    }
  }

  res.status(201).json({
    status: 'success',
    data: website,
  });
});

export const getWebsites = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);

  const websites = await prisma.website.findMany({
    where: { tenantId: tenant.id },
    include: {
      pages: {
        select: {
          id: true,
          name: true,
          slug: true,
          meta: true,
        },
      },
    },
  });

  res.json({
    status: 'success',
    data: websites,
  });
});

export const getWebsite = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);
  const { id } = req.params;

  const website = await prisma.website.findFirst({
    where: {
      id,
      tenantId: tenant.id,
    },
    include: {
      pages: true,
    },
  });

  if (!website) {
    throw new AppError('Website not found', 404);
  }

  res.json({
    status: 'success',
    data: website,
  });
});

export const updateWebsite = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);
  const { id } = req.params;
  const updates = updateWebsiteSchema.parse(req.body);

  // Check if domain is available
  if (updates.domain) {
    const existingDomain = await prisma.website.findFirst({
      where: {
        domain: updates.domain,
        id: { not: id },
      },
    });

    if (existingDomain) {
      throw new AppError('Domain is already in use', 400);
    }
  }

  const website = await prisma.website.findFirst({
    where: {
      id,
      tenantId: tenant.id,
    },
  });

  if (!website) {
    throw new AppError('Website not found', 404);
  }

  // Update website
  const updatedWebsite = await prisma.website.update({
    where: { id },
    data: updates,
    include: {
      pages: true,
    },
  });

  // Handle domain changes
  if (updates.domain && updates.domain !== website.domain) {
    try {
      // Remove old domain if exists
      if (website.domain) {
        // Find and delete old DNS records
        const records = await CloudflareService.listDnsRecords();
        const oldRecord = records.find(r => r.name === website.domain);
        if (oldRecord) {
          await CloudflareService.deleteDnsRecord(oldRecord.id);
        }
      }

      // Setup new domain
      await CloudflareService.setupDomain(updates.domain, process.env.APP_IP!);
    } catch (error) {
      logger.error(`Failed to update domain for website ${id}:`, error);
      // Don't fail the website update if domain setup fails
    }
  }

  res.json({
    status: 'success',
    data: updatedWebsite,
  });
});

export const deleteWebsite = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);
  const { id } = req.params;

  const website = await prisma.website.findFirst({
    where: {
      id,
      tenantId: tenant.id,
    },
  });

  if (!website) {
    throw new AppError('Website not found', 404);
  }

  // Delete website
  await prisma.website.delete({
    where: { id },
  });

  // Clean up domain if exists
  if (website.domain) {
    try {
      const records = await CloudflareService.listDnsRecords();
      const record = records.find(r => r.name === website.domain);
      if (record) {
        await CloudflareService.deleteDnsRecord(record.id);
      }
    } catch (error) {
      logger.error(`Failed to cleanup domain for website ${id}:`, error);
    }
  }

  res.json({
    status: 'success',
    message: 'Website deleted successfully',
  });
});

export const updatePage = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = getCurrentTenant(req);
  const { websiteId, pageId } = req.params;
  const updates = updatePageSchema.parse(req.body);

  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      websiteId,
      website: {
        tenantId: tenant.id,
      },
    },
  });

  if (!page) {
    throw new AppError('Page not found', 404);
  }

  const updatedPage = await prisma.page.update({
    where: { id: pageId },
    data: updates,
  });

  res.json({
    status: 'success',
    data: updatedPage,
  });
});
