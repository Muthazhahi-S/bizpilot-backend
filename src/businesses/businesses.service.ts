import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessProfileDto, UpdateBusinessProfileDto } from './businesses.dto.js';

const PROFILE_FIELDS = ['name', 'email', 'phone', 'industry', 'location'] as const;

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string | undefined): Promise<BusinessProfileDto> {
    const businessId = this.requireBusinessId(id);

    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new NotFoundException('Business not found.');
      }
      return business;
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  async update(
    id: string | undefined,
    dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfileDto> {
    const businessId = this.requireBusinessId(id);
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      throw new BadRequestException('Business profile details must be an object.');
    }

    const unknownFields = Object.keys(dto).filter(
      (field) => !PROFILE_FIELDS.includes(field as (typeof PROFILE_FIELDS)[number]),
    );
    if (unknownFields.length > 0) {
      throw new BadRequestException(`Unsupported business profile field: ${unknownFields[0]}.`);
    }

    const data: Prisma.BusinessUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = this.requireText(dto.name, 'name', 120);
    }
    if (dto.email !== undefined) {
      data.email = this.requireEmail(dto.email);
    }
    if (dto.phone !== undefined) {
      data.phone = this.optionalText(dto.phone, 'phone', 40);
    }
    if (dto.industry !== undefined) {
      data.industry = this.optionalText(dto.industry, 'industry', 120);
    }
    if (dto.location !== undefined) {
      data.location = this.optionalText(dto.location, 'location', 200);
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one editable business profile field is required.');
    }

    try {
      return await this.prisma.business.update({
        where: { id: businessId },
        data,
      });
    } catch (error) {
      this.rethrowApiOrDatabaseError(error);
    }
  }

  private requireBusinessId(value: string | undefined): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('Business id is required.');
    }
    return value.trim();
  }

  private requireText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required.`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer.`);
    }
    return normalized;
  }

  private optionalText(value: unknown, field: string, maxLength: number): string | null {
    if (value === null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string or null.`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer.`);
    }
    return normalized || null;
  }

  private requireEmail(value: unknown): string {
    const email = this.requireText(value, 'email', 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email must be a valid email address.');
    }
    return email;
  }

  private rethrowApiOrDatabaseError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Business not found.');
    }

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code))
    ) {
      this.logger.error('Business profile operation failed because the database is unavailable.');
      throw new ServiceUnavailableException('Business profile data is temporarily unavailable.');
    }

    throw error;
  }
}
