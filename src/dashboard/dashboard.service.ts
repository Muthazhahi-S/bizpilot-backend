import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnquiryStatus, LeadStatus } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardResponseDto, LeadPipelineCountsDto } from './dashboard.dto.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(businessId: string | undefined): Promise<DashboardResponseDto> {
    const normalizedBusinessId = businessId?.trim();
    if (!normalizedBusinessId) {
      throw new BadRequestException('businessId query parameter is required.');
    }

    try {
      const business = await this.prisma.business.findUnique({
        where: { id: normalizedBusinessId },
        select: { id: true },
      });

      if (!business) {
        throw new NotFoundException('Business not found.');
      }

      const leadFilter = { businessId: normalizedBusinessId };
      const [totalLeads, newEnquiries, contactedLeads, convertedLeads, recentEnquiries, statusGroups] =
        await Promise.all([
          this.prisma.lead.count({ where: leadFilter }),
          this.prisma.enquiry.count({
            where: { businessId: normalizedBusinessId, status: EnquiryStatus.NEW },
          }),
          this.prisma.lead.count({
            where: { ...leadFilter, status: LeadStatus.CONTACTED },
          }),
          this.prisma.lead.count({
            where: { ...leadFilter, status: LeadStatus.CONVERTED },
          }),
          this.prisma.enquiry.findMany({
            where: { businessId: normalizedBusinessId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              message: true,
              source: true,
              status: true,
              createdAt: true,
              customer: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
          this.prisma.lead.groupBy({
            by: ['status'],
            where: leadFilter,
            _count: { _all: true },
          }),
        ]);

      const leadPipeline: LeadPipelineCountsDto = {
        [LeadStatus.NEW]: 0,
        [LeadStatus.CONTACTED]: 0,
        [LeadStatus.QUALIFIED]: 0,
        [LeadStatus.CONVERTED]: 0,
        [LeadStatus.LOST]: 0,
      };

      for (const group of statusGroups) {
        leadPipeline[group.status] = group._count._all;
      }

      return {
        businessId: business.id,
        totalLeads,
        newEnquiries,
        contactedLeads,
        convertedLeads,
        recentEnquiries,
        leadPipeline,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if (this.isDatabaseUnavailable(error)) {
        this.logger.error('Dashboard query failed because the database is unavailable.');
        throw new ServiceUnavailableException('Dashboard data is temporarily unavailable.');
      }

      throw error;
    }
  }

  private isDatabaseUnavailable(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code))
    );
  }
}
