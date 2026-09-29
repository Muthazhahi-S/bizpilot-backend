import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { EnquiryStatus, LeadSource } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateEnquiryDto,
  EnquiryFiltersDto,
  EnquiryResponseDto,
  UpdateEnquiryDto,
} from './enquiries.dto.js';

const ENQUIRY_STATUSES = Object.values(EnquiryStatus);
const LEAD_SOURCES = Object.values(LeadSource);

const enquiryInclude = {
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
} satisfies Prisma.EnquiryInclude;

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: EnquiryFiltersDto): Promise<EnquiryResponseDto[]> {
    if (!filters || typeof filters !== 'object') {
      throw new BadRequestException('Enquiry filters must be an object.');
    }
    const businessId = this.requireBusinessId(filters.businessId);
    const status = this.parseEnum(filters.status, ENQUIRY_STATUSES, 'status');
    const source = this.parseEnum(filters.source, LEAD_SOURCES, 'source');
    if (filters.search !== undefined && typeof filters.search !== 'string') {
      throw new BadRequestException('search must be a string.');
    }
    const search = filters.search?.trim();

    try {
      await this.requireBusiness(businessId);
      return await this.prisma.enquiry.findMany({
        where: {
          businessId,
          ...(status ? { status } : {}),
          ...(source ? { source } : {}),
          ...(search
            ? {
                OR: [
                  { message: { contains: search, mode: 'insensitive' } },
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
        include: enquiryInclude,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  async create(dto: CreateEnquiryDto): Promise<EnquiryResponseDto> {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Enquiry details must be an object.');
    }
    const businessId = this.requireBusinessId(dto.businessId);
    const customerId = this.requireRequiredString(dto.customerId, 'customerId');
    const message = this.requireRequiredString(dto.message, 'message');
    const source = this.parseRequiredEnum(dto.source, LEAD_SOURCES, 'source');
    const status = this.parseEnum(dto.status, ENQUIRY_STATUSES, 'status');

    try {
      await this.requireBusiness(businessId);
      await this.requireCustomer(businessId, customerId);
      return await this.prisma.enquiry.create({
        data: {
          businessId,
          customerId,
          message,
          source,
          ...(status ? { status } : {}),
        },
        include: enquiryInclude,
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  async update(id: string | undefined, dto: UpdateEnquiryDto): Promise<EnquiryResponseDto> {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Enquiry update details must be an object.');
    }
    const enquiryId = this.requireRequiredString(id, 'id');
    const businessId = this.requireBusinessId(dto.businessId);
    const data: Prisma.EnquiryUncheckedUpdateManyInput = {};

    if (dto.customerId !== undefined) {
      data.customerId = this.requireRequiredString(dto.customerId, 'customerId');
    }
    if (dto.message !== undefined) {
      data.message = this.requireRequiredString(dto.message, 'message');
    }
    if (dto.source !== undefined) {
      data.source = this.parseRequiredEnum(dto.source, LEAD_SOURCES, 'source');
    }
    if (dto.status !== undefined) {
      data.status = this.parseRequiredEnum(dto.status, ENQUIRY_STATUSES, 'status');
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one editable enquiry field is required.');
    }

    try {
      await this.requireBusiness(businessId);
      if (dto.customerId !== undefined) {
        await this.requireCustomer(
          businessId,
          this.requireRequiredString(dto.customerId, 'customerId'),
        );
      }

      const result = await this.prisma.enquiry.updateMany({
        where: { id: enquiryId, businessId },
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException('Enquiry not found for this business.');
      }

      const updatedEnquiry = await this.prisma.enquiry.findFirst({
        where: { id: enquiryId, businessId },
        include: enquiryInclude,
      });
      if (!updatedEnquiry) {
        throw new NotFoundException('Enquiry not found for this business.');
      }

      return updatedEnquiry;
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

  private async requireCustomer(businessId: string, customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id_businessId: { id: customerId, businessId } },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException('customerId must belong to the specified business.');
    }
  }

  private requireBusinessId(value: string | undefined): string {
    return this.requireRequiredString(value, 'businessId');
  }

  private requireRequiredString(value: string | undefined, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required.`);
    }
    return value.trim();
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
      throw new BadRequestException(`${field} must be one of: ${allowedValues.join(', ')}.`);
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
      this.logger.error('Enquiry operation failed because the database is unavailable.');
      throw new ServiceUnavailableException('Enquiry data is temporarily unavailable.');
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new BadRequestException('A referenced customer or business does not exist.');
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
