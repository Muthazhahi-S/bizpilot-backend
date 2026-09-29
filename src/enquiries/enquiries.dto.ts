import { EnquiryStatus, LeadSource } from '../generated/prisma/enums.js';

export interface EnquiryCustomerDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface EnquiryResponseDto {
  id: string;
  businessId: string;
  customerId: string;
  message: string;
  source: LeadSource;
  status: EnquiryStatus;
  createdAt: Date;
  updatedAt: Date;
  customer: EnquiryCustomerDto;
}

export interface CreateEnquiryDto {
  businessId: string;
  customerId: string;
  message: string;
  source: LeadSource;
  status?: EnquiryStatus;
}

export interface UpdateEnquiryDto {
  businessId: string;
  customerId?: string;
  message?: string;
  source?: LeadSource;
  status?: EnquiryStatus;
}

export interface EnquiryFiltersDto {
  businessId?: string;
  status?: string;
  source?: string;
  search?: string;
}
