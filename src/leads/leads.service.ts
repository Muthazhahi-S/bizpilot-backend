import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { LeadSource, LeadStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateLeadDto,
  LeadFiltersDto,
  LeadResponseDto,
  UpdateLeadDto,
} from './leads.dto.js';

const LEAD_STATUSES = Object.values(LeadStatus);
const LEAD_SOURCES = Object.values(LeadSource);

const leadInclude = {
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
} satisfies Prisma.LeadInclude;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: LeadFiltersDto): Promise<LeadResponseDto[]> {
    if (!filters || typeof filters !== 'object') {
      throw new BadRequestException('Lead filters must be an object.');
    }
    const businessId = this.requireBusinessId(filters.businessId);
    const status = this.parseEnum(filters.status, LEAD_STATUSES, 'status');
    const source = this.parseEnum(filters.source, LEAD_SOURCES, 'source');
    if (filters.search !== undefined && typeof filters.search !== 'string') {
      throw new BadRequestException('search must be a string.');
    }
    const search = filters.search?.trim();

    try {
      await this.requireBusiness(businessId);
      return await this.prisma.lead.findMany({
        where: {
          businessId,
          ...(status ? { status } : {}),
          ...(source ? { source } : {}),
          ...(search
            ? {
                OR: [
                  { service: { contains: search, mode: 'insensitive' } },
                  {
                    customer: {
                      is: {
                        OR: [
                          { name: { contains: search, mode: 'insensitive' } },
                          { email: { contains: search, mode: 'insensitive' } },
                        ],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: leadInclude,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  async create(dto: CreateLeadDto): Promise<LeadResponseDto> {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Lead details must be an object.');
    }
    const businessId = this.requireBusinessId(dto.businessId);
    const customerId = this.requireRequiredString(dto.customerId, 'customerId');
    const service = this.requireRequiredString(dto.service, 'service');
    const source = this.parseEnum(dto.source, LEAD_SOURCES, 'source');
    const status = this.parseEnum(dto.status, LEAD_STATUSES, 'status');
    const message = this.optionalMessage(dto.message);

    try {
      await this.requireBusiness(businessId);
      await this.requireCustomer(businessId, customerId);
      return await this.prisma.lead.create({
        data: {
          businessId,
          customerId,
          service,
          ...(source ? { source } : {}),
          ...(status ? { status } : {}),
          ...(message !== undefined ? { message } : {}),
        },
        include: leadInclude,
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  async update(
    id: string | undefined,
    dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Lead update details must be an object.');
    }
    const leadId = this.requireRequiredString(id, 'id');
    const businessId = this.requireBusinessId(dto.businessId);
    const data: Prisma.LeadUpdateInput = {};

    if (dto.customerId !== undefined) {
      const customerId = this.requireRequiredString(
        dto.customerId,
        'customerId',
      );
      data.customer = {
        connect: { id_businessId: { id: customerId, businessId } },
      };
    }
    if (dto.service !== undefined) {
      data.service = this.requireRequiredString(dto.service, 'service');
    }
    if (dto.source !== undefined) {
      data.source = this.parseRequiredEnum(dto.source, LEAD_SOURCES, 'source');
    }
    if (dto.status !== undefined) {
      data.status = this.parseRequiredEnum(dto.status, LEAD_STATUSES, 'status');
    }
    if (dto.message !== undefined) {
      data.message = this.optionalMessage(dto.message);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one editable lead field is required.',
      );
    }

    try {
      await this.requireBusiness(businessId);
      if (dto.customerId !== undefined) {
        await this.requireCustomer(
          businessId,
          this.requireRequiredString(dto.customerId, 'customerId'),
        );
      }

      return await this.prisma.lead.update({
        where: { id: leadId, businessId },
        data,
        include: leadInclude,
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  private async requireBusiness(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found.');
    }
  }

  private async requireCustomer(
    businessId: string,
    customerId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id_businessId: { id: customerId, businessId } },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException(
        'customerId must belong to the specified business.',
      );
    }
  }

  private requireBusinessId(value: string | undefined): string {
    return this.requireRequiredString(value, 'businessId');
  }

  private requireRequiredString(
    value: string | undefined,
    field: string,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} is required.`);
    }
    return normalized;
  }

  private optionalMessage(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('message must be a string or null.');
    }
    return value.trim() || null;
  }

  private parseEnum<T extends string>(
    value: string | undefined,
    allowedValues: readonly T[],
    field: string,
  ): T | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }
    if (!allowedValues.includes(value as T)) {
      throw new BadRequestException(
        `${field} must be one of: ${allowedValues.join(', ')}.`,
      );
    }
    return value as T;
  }

  private parseRequiredEnum<T extends string>(
    value: string,
    allowedValues: readonly T[],
    field: string,
  ): T {
    const parsed = this.parseEnum(value, allowedValues, field);
    if (!parsed) {
      throw new BadRequestException(`${field} is required.`);
    }
    return parsed;
  }

  private rethrowApiOrDatabaseError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }

    if (this.isDatabaseUnavailable(error)) {
      this.logger.error(
        'Lead operation failed because the database is unavailable.',
      );
      throw new ServiceUnavailableException(
        'Lead data is temporarily unavailable.',
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException(
        'A referenced customer or business does not exist.',
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(
        'Lead or related business/customer not found.',
      );
    }

    throw error;
  }

  private isDatabaseUnavailable(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code))
    );
  }
}
