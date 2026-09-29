import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessesService } from './businesses.service.js';

describe('BusinessesService', () => {
  const profile = {
    id: 'bizpilot-demo-urbannest',
    name: 'UrbanNest Interiors',
    email: 'ananya@urbannest.in',
    phone: '+910000000000',
    industry: 'Interior Design',
    location: 'Bengaluru',
    createdAt: new Date('2026-09-29T10:00:00Z'),
    updatedAt: new Date('2026-09-29T10:00:00Z'),
  };
  const prisma = {
    business: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  let service: BusinessesService;

  beforeEach(async () => {
    prisma.business.findUnique.mockReset().mockResolvedValue(profile);
    prisma.business.update.mockReset().mockResolvedValue(profile);
    const module = await Test.createTestingModule({
      providers: [BusinessesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BusinessesService);
  });

  it('returns a profile by business id', async () => {
    await expect(service.findOne(profile.id)).resolves.toEqual(profile);
    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { id: profile.id },
    });
  });

  it('returns 404 when the business does not exist', async () => {
    prisma.business.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('missing-business')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('validates and updates supported profile fields', async () => {
    await service.update(profile.id, {
      name: ' UrbanNest Studio ',
      email: 'hello@urbannest.in',
      phone: ' 0800000000 ',
      industry: 'Interior Design',
      location: 'Bengaluru, Karnataka',
    });
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: profile.id },
      data: {
        name: 'UrbanNest Studio',
        email: 'hello@urbannest.in',
        phone: '0800000000',
        industry: 'Interior Design',
        location: 'Bengaluru, Karnataka',
      },
    });
  });

  it('rejects invalid email, empty updates, and unsupported schema fields', async () => {
    await expect(
      service.update(profile.id, { email: 'not-an-email' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(profile.id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.update(profile.id, { website: 'urbannest.in' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('returns 503 when the database is unavailable', async () => {
    prisma.business.findUnique.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Database unavailable.', {
        code: 'P1001',
        clientVersion: 'test',
      }),
    );
    await expect(service.findOne(profile.id)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
