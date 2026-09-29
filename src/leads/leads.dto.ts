import { LeadSource, LeadStatus } from '../generated/prisma/enums.js';

export interface LeadCustomerDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface LeadResponseDto {
  id: string;
  businessId: string;
  customerId: string;
  service: string;
  source: LeadSource;
  status: LeadStatus;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: LeadCustomerDto;
}

export interface CreateLeadDto {
  businessId: string;
  customerId: string;
  service: string;
  source?: LeadSource;
  status?: LeadStatus;
  message?: string | null;
}

export interface UpdateLeadDto {
  businessId: string;
  customerId?: string;
  service?: string;
  source?: LeadSource;
  status?: LeadStatus;
  message?: string | null;
}

export interface LeadFiltersDto {
  businessId?: string;
  status?: string;
  source?: string;
  search?: string;
}
