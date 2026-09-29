import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { EnquiryStatus, LeadStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AssistantContextDto,
  AssistantEnquiryStatusCounts,
  AssistantLeadStatusCounts,
} from './ai-assistant.dto.js';

const leadSelect = {
  id: true,
  service: true,
  source: true,
  status: true,
  message: true,
  createdAt: true,
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.LeadSelect;

const enquirySelect = {
  id: true,
  message: true,
  source: true,
  status: true,
  createdAt: true,
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.EnquirySelect;

@Injectable()
export class AiAssistantContextService {
  private readonly logger = new Logger(AiAssistantContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getContext(businessId: string): Promise<AssistantContextDto> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          industry: true,
          location: true,
        },
      });
      if (!business) throw new NotFoundException('Business not found.');

      const [recentLeads, recentEnquiries, leadGroups, enquiryGroups] = await Promise.all([
        this.prisma.lead.findMany({
          where: { businessId },
          select: leadSelect,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.enquiry.findMany({
          where: { businessId },
          select: enquirySelect,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { businessId },
          _count: { _all: true },
        }),
        this.prisma.enquiry.groupBy({
          by: ['status'],
          where: { businessId },
          _count: { _all: true },
        }),
      ]);

      const leadStatusCounts = this.countLeadStatuses(leadGroups);
      const enquiryStatusCounts = this.countEnquiryStatuses(enquiryGroups);
      return {
        business,
        totalLeads: Object.values(leadStatusCounts).reduce((sum, count) => sum + count, 0),
        recentLeads,
        leadStatusCounts,
        totalEnquiries: Object.values(enquiryStatusCounts).reduce(
          (sum, count) => sum + count,
          0,
        ),
        recentEnquiries,
        enquiryStatusCounts,
      };
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  private countLeadStatuses(
    groups: { status: LeadStatus; _count: { _all: number } }[],
  ): AssistantLeadStatusCounts {
    const counts: AssistantLeadStatusCounts = {
      [LeadStatus.NEW]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.QUALIFIED]: 0,
      [LeadStatus.CONVERTED]: 0,
      [LeadStatus.LOST]: 0,
    };
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }

  private countEnquiryStatuses(
    groups: { status: EnquiryStatus; _count: { _all: number } }[],
  ): AssistantEnquiryStatusCounts {
    const counts: AssistantEnquiryStatusCounts = {
      [EnquiryStatus.NEW]: 0,
      [EnquiryStatus.IN_PROGRESS]: 0,
      [EnquiryStatus.RESOLVED]: 0,
      [EnquiryStatus.CLOSED]: 0,
    };
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }

  private rethrowApiOrDatabaseError(error: unknown): never {
    if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code))
    ) {
      this.logger.error('Assistant context could not be loaded because the database is unavailable.');
      throw new ServiceUnavailableException('Assistant context is temporarily unavailable.');
    }
    throw error;
  }
}
