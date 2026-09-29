import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { EnquiryStatus, LeadStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiAssistantContextService } from './ai-assistant-context.service.js';

describe('AiAssistantContextService', () => {
  const prisma = {
    business: { findUnique: vi.fn() },
    lead: { findMany: vi.fn(), groupBy: vi.fn() },
    enquiry: { findMany: vi.fn(), groupBy: vi.fn() },
  };
  let service: AiAssistantContextService;

  beforeEach(async () => {
    prisma.business.findUnique.mockReset().mockResolvedValue({
      id: 'business-1',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: null,
      industry: 'Interior Design',
      location: 'Bengaluru',
    });
    prisma.lead.findMany.mockReset().mockResolvedValue([]);
    prisma.lead.groupBy.mockReset().mockResolvedValue([
      { status: LeadStatus.NEW, _count: { _all: 3 } },
      { status: LeadStatus.CONVERTED, _count: { _all: 2 } },
    ]);
    prisma.enquiry.findMany.mockReset().mockResolvedValue([]);
    prisma.enquiry.groupBy.mockReset().mockResolvedValue([
      { status: EnquiryStatus.NEW, _count: { _all: 2 } },
      { status: EnquiryStatus.RESOLVED, _count: { _all: 1 } },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        AiAssistantContextService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AiAssistantContextService);
  });

  it('loads complete tenant-scoped context with totals, status counts, and recent records', async () => {
    const context = await service.getContext('business-1');
    expect(context).toEqual({
      business: expect.objectContaining({ id: 'business-1', name: 'UrbanNest Interiors' }),
      totalLeads: 5,
      recentLeads: [],
      leadStatusCounts: {
        NEW: 3,
        CONTACTED: 0,
        QUALIFIED: 0,
        CONVERTED: 2,
        LOST: 0,
      },
      totalEnquiries: 3,
      recentEnquiries: [],
      enquiryStatusCounts: {
        NEW: 2,
        IN_PROGRESS: 0,
        RESOLVED: 1,
        CLOSED: 0,
      },
    });
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'business-1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    );
    expect(prisma.enquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'business-1' }, take: 5 }),
    );
    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'business-1' } }),
    );
    expect(prisma.enquiry.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'business-1' } }),
    );
  });

  it('returns 404 for an unknown business', async () => {
    prisma.business.findUnique.mockResolvedValueOnce(null);
    await expect(service.getContext('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('returns 503 when context queries cannot connect to the database', async () => {
    prisma.enquiry.findMany.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Database unavailable.', {
        code: 'P1001',
        clientVersion: 'test',
      }),
    );
    await expect(service.getContext('business-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
