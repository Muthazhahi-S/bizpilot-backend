import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { EnquiriesService } from './enquiries.service.js';

describe('EnquiriesService', () => {
  const prisma = {
    business: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
    enquiry: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };
  let service: EnquiriesService;

  beforeEach(async () => {
    prisma.business.findUnique.mockReset().mockResolvedValue({ id: 'business-1' });
    prisma.customer.findUnique.mockReset().mockResolvedValue({ id: 'customer-1' });
    prisma.enquiry.findMany.mockReset().mockResolvedValue([]);
    prisma.enquiry.create.mockReset().mockResolvedValue({ id: 'enquiry-1' });
    prisma.enquiry.updateMany.mockReset().mockResolvedValue({ count: 1 });
    prisma.enquiry.findFirst.mockReset().mockResolvedValue({ id: 'enquiry-1' });

    const module = await Test.createTestingModule({
      providers: [EnquiriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(EnquiriesService);
  });

  it('scopes filters, customer search, and results to the selected business', async () => {
    await service.findAll({
      businessId: 'business-1',
      status: 'IN_PROGRESS',
      source: 'WHATSAPP',
      search: 'Riya',
    });

    expect(prisma.enquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-1',
          status: 'IN_PROGRESS',
          source: 'WHATSAPP',
          OR: expect.any(Array),
        }),
        include: expect.objectContaining({ customer: expect.any(Object) }),
      }),
    );
  });

  it('rejects unsupported status filters', async () => {
    await expect(
      service.findAll({ businessId: 'business-1', status: 'UNKNOWN' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.enquiry.findMany).not.toHaveBeenCalled();
  });

  it('requires a customer belonging to the business when creating an enquiry', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({
        businessId: 'business-1',
        customerId: 'other-customer',
        message: 'Question',
        source: 'WEBSITE',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.enquiry.create).not.toHaveBeenCalled();
  });

  it('scopes status updates and returns 404 for another business enquiry', async () => {
    prisma.enquiry.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.update('enquiry-1', { businessId: 'business-1', status: 'RESOLVED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.enquiry.updateMany).toHaveBeenCalledWith({
      where: { id: 'enquiry-1', businessId: 'business-1' },
      data: { status: 'RESOLVED' },
    });
  });
});
