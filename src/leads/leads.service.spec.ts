import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadsService } from './leads.service.js';

describe('LeadsService', () => {
  const prisma = {
    business: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
    lead: { findMany: vi.fn() },
  };
  let service: LeadsService;

  beforeEach(async () => {
    prisma.business.findUnique
      .mockReset()
      .mockResolvedValue({ id: 'business-1' });
    prisma.customer.findUnique
      .mockReset()
      .mockResolvedValue({ id: 'customer-1' });
    prisma.lead.findMany.mockReset().mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(LeadsService);
  });

  it('scopes filters and search to the selected business', async () => {
    await service.findAll({
      businessId: 'business-1',
      status: 'CONTACTED',
      source: 'WHATSAPP',
      search: 'Riya',
    });

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-1',
          status: 'CONTACTED',
          source: 'WHATSAPP',
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('rejects unsupported status filters', async () => {
    await expect(
      service.findAll({ businessId: 'business-1', status: 'IN_PROGRESS' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('rejects a customer that is not associated with the business', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({
        businessId: 'business-1',
        customerId: 'another-business-customer',
        service: 'Kitchen design',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
