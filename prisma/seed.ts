import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EnquiryStatus,
  LeadSource,
  LeadStatus,
} from '../src/generated/prisma/enums.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { Pool } from 'pg';

const businessData = {
  id: 'bizpilot-demo-urbannest',
  name: 'UrbanNest Interiors',
  email: 'ananya@urbannest.in',
  phone: '+91 00000 00000',
  industry: 'Interior Design',
  location: 'Bengaluru',
};

const customers = [
  {
    id: 'bizpilot-demo-customer-rohan',
    name: 'Rohan Kapoor',
    email: 'rohan.kapoor@example.com',
    phone: '+91 90000 10001',
  },
  {
    id: 'bizpilot-demo-customer-priya',
    name: 'Priya Menon',
    email: 'priya.menon@example.com',
    phone: '+91 90000 10002',
  },
  {
    id: 'bizpilot-demo-customer-arjun',
    name: 'Arjun Shah',
    email: 'arjun.shah@example.com',
    phone: '+91 90000 10003',
  },
  {
    id: 'bizpilot-demo-customer-neha',
    name: 'Neha Desai',
    email: 'neha.desai@example.com',
    phone: '+91 90000 10004',
  },
];

const leads = [
  {
    id: 'bizpilot-demo-lead-rohan',
    customerId: customers[0].id,
    service: 'Full home interiors',
    source: LeadSource.WEBSITE,
    status: LeadStatus.NEW,
    message:
      'Looking for a complete interior design for a new 2 BHK apartment.',
  },
  {
    id: 'bizpilot-demo-lead-priya',
    customerId: customers[1].id,
    service: 'Kitchen design',
    source: LeadSource.WHATSAPP,
    status: LeadStatus.CONTACTED,
    message: 'Interested in a modular kitchen with additional storage.',
  },
  {
    id: 'bizpilot-demo-lead-arjun',
    customerId: customers[2].id,
    service: '2 BHK renovation',
    source: LeadSource.INSTAGRAM,
    status: LeadStatus.QUALIFIED,
    message: 'Planning a renovation and comparing project timelines.',
  },
  {
    id: 'bizpilot-demo-lead-neha',
    customerId: customers[3].id,
    service: 'Living room styling',
    source: LeadSource.REFERRAL,
    status: LeadStatus.CONVERTED,
    message: 'Referred by an existing client for a living room refresh.',
  },
  {
    id: 'bizpilot-demo-lead-rohan-followup',
    customerId: customers[0].id,
    service: 'Wardrobe design',
    source: LeadSource.PHONE,
    status: LeadStatus.LOST,
    message: 'Asked about a separate bedroom wardrobe project.',
  },
];

const enquiries = [
  {
    id: 'bizpilot-demo-enquiry-rohan',
    customerId: customers[0].id,
    message: 'Could you share your 2 BHK interior design packages?',
    source: LeadSource.WEBSITE,
    status: EnquiryStatus.NEW,
  },
  {
    id: 'bizpilot-demo-enquiry-priya',
    customerId: customers[1].id,
    message: 'Can we schedule a call to discuss kitchen finishes?',
    source: LeadSource.WHATSAPP,
    status: EnquiryStatus.IN_PROGRESS,
  },
  {
    id: 'bizpilot-demo-enquiry-arjun',
    customerId: customers[2].id,
    message: 'Do you provide renovation services in Bengaluru?',
    source: LeadSource.INSTAGRAM,
    status: EnquiryStatus.RESOLVED,
  },
  {
    id: 'bizpilot-demo-enquiry-neha',
    customerId: customers[3].id,
    message: 'Thank you, the project is complete. Please close this enquiry.',
    source: LeadSource.REFERRAL,
    status: EnquiryStatus.CLOSED,
  },
];

async function seed(prisma: PrismaClient): Promise<string> {
  const business = await prisma.business.upsert({
    where: { id: businessData.id },
    update: businessData,
    create: businessData,
  });

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: { ...customer, businessId: business.id },
      create: { ...customer, businessId: business.id },
    });
  }

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: { ...lead, businessId: business.id },
      create: { ...lead, businessId: business.id },
    });
  }

  for (const enquiry of enquiries) {
    await prisma.enquiry.upsert({
      where: { id: enquiry.id },
      update: { ...enquiry, businessId: business.id },
      create: { ...enquiry, businessId: business.id },
    });
  }

  return business.id;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured before seeding.');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const businessId = await seed(prisma);
    console.info(`Demo seed complete. Business ID: ${businessId}`);
  } finally {
    try {
      await prisma.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

main().catch(() => {
  console.error(
    'Demo seed failed. Check DATABASE_URL and PostgreSQL availability.',
  );
  process.exitCode = 1;
});
