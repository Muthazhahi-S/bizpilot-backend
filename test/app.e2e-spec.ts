import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { Prisma } from './../src/generated/prisma/client.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    business: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    enquiry: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn(),
    },
  };

  beforeEach(async () => {
    prisma.business.findUnique.mockClear();
    prisma.business.update.mockClear();
    prisma.lead.count.mockClear();
    prisma.lead.groupBy.mockClear();
    prisma.lead.findMany.mockClear();
    prisma.lead.create.mockClear();
    prisma.lead.update.mockClear();
    prisma.customer.findUnique.mockClear();
    prisma.enquiry.count.mockClear();
    prisma.enquiry.findMany.mockClear();
    prisma.enquiry.groupBy.mockClear();
    prisma.enquiry.create.mockClear();
    prisma.enquiry.updateMany.mockClear();
    prisma.enquiry.findFirst.mockClear();
    prisma.business.findUnique.mockResolvedValue({ id: 'business-1' });
    prisma.business.update.mockResolvedValue({
      id: 'bizpilot-demo-urbannest',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: '+910000000000',
      industry: 'Interior Design',
      location: 'Bengaluru',
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
    });
    prisma.lead.count.mockImplementation(
      ({ where }: { where: { status?: string } }) => {
        if (where.status === 'CONTACTED') return Promise.resolve(4);
        if (where.status === 'CONVERTED') return Promise.resolve(2);
        return Promise.resolve(10);
      },
    );
    prisma.lead.findMany.mockResolvedValue([]);
    prisma.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 3 } },
      { status: 'CONTACTED', _count: { _all: 4 } },
      { status: 'CONVERTED', _count: { _all: 2 } },
    ]);
    prisma.lead.create.mockResolvedValue({
      id: 'lead-1',
      businessId: 'business-1',
      customerId: 'customer-1',
      service: 'Kitchen design',
      source: 'WEBSITE',
      status: 'NEW',
      message: null,
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
      customer: {
        id: 'customer-1',
        name: 'Riya Shah',
        email: 'riya@example.com',
        phone: null,
      },
    });
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    prisma.lead.update.mockResolvedValue({
      id: 'lead-1',
      businessId: 'business-1',
      customerId: 'customer-1',
      service: 'Kitchen design',
      source: 'WEBSITE',
      status: 'CONTACTED',
      message: null,
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
      customer: {
        id: 'customer-1',
        name: 'Riya Shah',
        email: 'riya@example.com',
        phone: null,
      },
    });
    prisma.enquiry.count.mockResolvedValue(3);
    prisma.enquiry.findMany.mockResolvedValue([
      {
        id: 'enquiry-1',
        message: 'Interested in a consultation',
        source: 'WEBSITE',
        status: 'NEW',
        createdAt: new Date('2026-09-29T10:00:00Z'),
        customer: {
          id: 'customer-1',
          name: 'Riya Shah',
          email: 'riya@example.com',
        },
      },
    ]);
    prisma.enquiry.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 2 } },
      { status: 'RESOLVED', _count: { _all: 1 } },
    ]);
    prisma.enquiry.create.mockResolvedValue({
      id: 'enquiry-1',
      businessId: 'business-1',
      customerId: 'customer-1',
      message: 'Interested in a consultation',
      source: 'WEBSITE',
      status: 'NEW',
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
      customer: {
        id: 'customer-1',
        name: 'Riya Shah',
        email: 'riya@example.com',
        phone: null,
      },
    });
    prisma.enquiry.updateMany.mockResolvedValue({ count: 1 });
    prisma.enquiry.findFirst.mockResolvedValue({
      id: 'enquiry-1',
      businessId: 'business-1',
      customerId: 'customer-1',
      message: 'Interested in a consultation',
      source: 'WEBSITE',
      status: 'RESOLVED',
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
      customer: {
        id: 'customer-1',
        name: 'Riya Shah',
        email: 'riya@example.com',
        phone: null,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/businesses/:id (GET) returns the business profile', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({
      id: 'bizpilot-demo-urbannest',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: '+910000000000',
      industry: 'Interior Design',
      location: 'Bengaluru',
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
    });

    const response = await request(app.getHttpServer())
      .get('/businesses/bizpilot-demo-urbannest')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'bizpilot-demo-urbannest',
        name: 'UrbanNest Interiors',
        email: 'ananya@urbannest.in',
        industry: 'Interior Design',
        location: 'Bengaluru',
      }),
    );
  });

  it('/businesses/:id (GET) returns 404 for an unknown business', async () => {
    prisma.business.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/businesses/missing-business').expect(404);
  });

  it('/businesses/:id (PATCH) updates supported profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/businesses/bizpilot-demo-urbannest')
      .send({
        name: 'UrbanNest Studio',
        email: 'hello@urbannest.in',
        phone: '0800000000',
        industry: 'Interior Design',
        location: 'Bengaluru, Karnataka',
      })
      .expect(200);

    expect(response.body.id).toBe('bizpilot-demo-urbannest');
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: 'bizpilot-demo-urbannest' },
      data: {
        name: 'UrbanNest Studio',
        email: 'hello@urbannest.in',
        phone: '0800000000',
        industry: 'Interior Design',
        location: 'Bengaluru, Karnataka',
      },
    });
  });

  it('/businesses/:id (PATCH) rejects invalid and unsupported fields', async () => {
    await request(app.getHttpServer())
      .patch('/businesses/bizpilot-demo-urbannest')
      .send({ email: 'not-an-email' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/businesses/bizpilot-demo-urbannest')
      .send({ website: 'urbannest.in' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/businesses/bizpilot-demo-urbannest')
      .send({})
      .expect(400);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('/ai-assistant/chat answers from business-scoped database context', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({
      id: 'bizpilot-demo-urbannest',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: '+910000000000',
      industry: 'Interior Design',
      location: 'Bengaluru',
    });

    const response = await request(app.getHttpServer())
      .post('/ai-assistant/chat')
      .send({
        businessId: 'bizpilot-demo-urbannest',
        message: 'How many leads do I have?',
      })
      .expect(201);

    expect(response.body).toEqual({
      answer: 'You have 9 leads in total.',
      data: {
        type: 'lead-count',
        total: 9,
        leadStatusCounts: {
          NEW: 3,
          CONTACTED: 4,
          QUALIFIED: 0,
          CONVERTED: 2,
          LOST: 0,
        },
      },
    });
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'bizpilot-demo-urbannest' } }),
    );
    expect(prisma.enquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'bizpilot-demo-urbannest' } }),
    );
    expect(prisma.enquiry.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'bizpilot-demo-urbannest' } }),
    );
  });

  it('/ai-assistant/chat validates request and business', async () => {
    await request(app.getHttpServer())
      .post('/ai-assistant/chat')
      .send({ businessId: 'business-1', message: ' ' })
      .expect(400);

    prisma.business.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .post('/ai-assistant/chat')
      .send({ businessId: 'missing-business', message: 'How many leads?' })
      .expect(404);
  });

  it('/dashboard (GET) returns business-scoped metrics and recent enquiries', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard')
      .query({ businessId: 'business-1' })
      .expect(200);

    expect(response.body).toEqual({
      businessId: 'business-1',
      totalLeads: 10,
      newEnquiries: 3,
      contactedLeads: 4,
      convertedLeads: 2,
      recentEnquiries: [
        {
          id: 'enquiry-1',
          message: 'Interested in a consultation',
          source: 'WEBSITE',
          status: 'NEW',
          createdAt: '2026-09-29T10:00:00.000Z',
          customer: {
            id: 'customer-1',
            name: 'Riya Shah',
            email: 'riya@example.com',
          },
        },
      ],
      leadPipeline: {
        NEW: 3,
        CONTACTED: 4,
        QUALIFIED: 0,
        CONVERTED: 2,
        LOST: 0,
      },
    });
    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { id: 'business-1' },
      select: { id: true },
    });
  });

  it('/dashboard (GET) requires a businessId', () => {
    return request(app.getHttpServer()).get('/dashboard').expect(400);
  });

  it('/dashboard (GET) returns 404 for an unknown business', async () => {
    prisma.business.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/dashboard')
      .query({ businessId: 'missing-business' })
      .expect(404);

    expect(prisma.lead.count).not.toHaveBeenCalled();
  });

  it('/leads (GET) filters leads within a business and returns customer details', async () => {
    prisma.lead.findMany.mockResolvedValueOnce([
      {
        id: 'lead-1',
        businessId: 'business-1',
        customerId: 'customer-1',
        service: 'Kitchen design',
        source: 'WEBSITE',
        status: 'NEW',
        message: 'Interested in a renovation',
        createdAt: new Date('2026-09-29T10:00:00Z'),
        updatedAt: new Date('2026-09-29T10:00:00Z'),
        customer: {
          id: 'customer-1',
          name: 'Riya Shah',
          email: 'riya@example.com',
          phone: null,
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/leads')
      .query({
        businessId: 'business-1',
        status: 'NEW',
        source: 'WEBSITE',
        search: 'Riya',
      })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].customer.name).toBe('Riya Shah');
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-1',
          status: 'NEW',
          source: 'WEBSITE',
          OR: expect.any(Array),
        }),
        include: expect.objectContaining({ customer: expect.any(Object) }),
      }),
    );
  });

  it('/leads (GET) rejects invalid filters and requires a business', async () => {
    await request(app.getHttpServer()).get('/leads').expect(400);
    await request(app.getHttpServer())
      .get('/leads')
      .query({ businessId: 'business-1', status: 'UNKNOWN' })
      .expect(400);
  });

  it('/leads (POST) validates fields and creates a business-scoped lead', async () => {
    const response = await request(app.getHttpServer())
      .post('/leads')
      .send({
        businessId: 'business-1',
        customerId: 'customer-1',
        service: 'Kitchen design',
        source: 'WEBSITE',
        message: 'Interested in a renovation',
      })
      .expect(201);

    expect(response.body.id).toBe('lead-1');
    expect(response.body.customer.name).toBe('Riya Shah');
    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id_businessId: { id: 'customer-1', businessId: 'business-1' } },
      select: { id: true },
    });
    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: 'business-1',
          customerId: 'customer-1',
          service: 'Kitchen design',
        }),
      }),
    );

    await request(app.getHttpServer())
      .post('/leads')
      .send({ businessId: 'business-1' })
      .expect(400);
  });

  it('/leads/:id (PATCH) updates a lead scoped to its business', async () => {
    await request(app.getHttpServer())
      .patch('/leads/lead-1')
      .send({ businessId: 'business-1', status: 'CONTACTED' })
      .expect(200);

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1', businessId: 'business-1' },
        data: { status: 'CONTACTED' },
      }),
    );
  });

  it('/leads/:id (PATCH) returns 404 for a lead outside the business', async () => {
    prisma.lead.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Record not found.', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await request(app.getHttpServer())
      .patch('/leads/other-lead')
      .send({ businessId: 'business-1', status: 'CONTACTED' })
      .expect(404);
  });

  it('/enquiries (GET) filters enquiries within a business and returns customer details', async () => {
    const response = await request(app.getHttpServer())
      .get('/enquiries')
      .query({
        businessId: 'business-1',
        status: 'NEW',
        source: 'WEBSITE',
        search: 'Riya',
      })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].customer.name).toBe('Riya Shah');
    expect(prisma.enquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-1',
          status: 'NEW',
          source: 'WEBSITE',
          OR: expect.any(Array),
        }),
        include: expect.objectContaining({ customer: expect.any(Object) }),
      }),
    );
  });

  it('/enquiries (GET) requires a business and rejects invalid filters', async () => {
    await request(app.getHttpServer()).get('/enquiries').expect(400);
    await request(app.getHttpServer())
      .get('/enquiries')
      .query({ businessId: 'business-1', status: 'UNKNOWN' })
      .expect(400);
  });

  it('/enquiries (POST) validates fields and creates a business-scoped enquiry', async () => {
    const response = await request(app.getHttpServer())
      .post('/enquiries')
      .send({
        businessId: 'business-1',
        customerId: 'customer-1',
        message: 'Interested in a consultation',
        source: 'WEBSITE',
        status: 'NEW',
      })
      .expect(201);

    expect(response.body.id).toBe('enquiry-1');
    expect(response.body.customer.name).toBe('Riya Shah');
    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id_businessId: { id: 'customer-1', businessId: 'business-1' } },
      select: { id: true },
    });
    expect(prisma.enquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: 'business-1',
          customerId: 'customer-1',
          message: 'Interested in a consultation',
          source: 'WEBSITE',
        }),
      }),
    );

    await request(app.getHttpServer())
      .post('/enquiries')
      .send({ businessId: 'business-1' })
      .expect(400);
  });

  it('/enquiries (POST) rejects a customer outside the business', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/enquiries')
      .send({
        businessId: 'business-1',
        customerId: 'other-business-customer',
        message: 'Question',
        source: 'WEBSITE',
      })
      .expect(400);

    expect(prisma.enquiry.create).not.toHaveBeenCalled();
  });

  it('/enquiries/:id (PATCH) updates an enquiry scoped to its business', async () => {
    const response = await request(app.getHttpServer())
      .patch('/enquiries/enquiry-1')
      .send({ businessId: 'business-1', status: 'RESOLVED' })
      .expect(200);

    expect(response.body.status).toBe('RESOLVED');
    expect(prisma.enquiry.updateMany).toHaveBeenCalledWith({
      where: { id: 'enquiry-1', businessId: 'business-1' },
      data: { status: 'RESOLVED' },
    });
  });

  it('/enquiries/:id (PATCH) returns 404 for an enquiry outside the business', async () => {
    prisma.enquiry.updateMany.mockResolvedValueOnce({ count: 0 });

    await request(app.getHttpServer())
      .patch('/enquiries/other-enquiry')
      .send({ businessId: 'business-1', status: 'RESOLVED' })
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
