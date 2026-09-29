import { EnquiryStatus, LeadSource, LeadStatus } from '../generated/prisma/enums.js';

export interface AssistantChatRequestDto {
  businessId: string;
  message: string;
}

export interface AssistantBusinessProfileDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  industry: string | null;
  location: string | null;
}

export interface AssistantLeadDto {
  id: string;
  service: string;
  source: LeadSource;
  status: LeadStatus;
  message: string | null;
  createdAt: Date;
  customer: { id: string; name: string; email: string | null };
}

export interface AssistantEnquiryDto {
  id: string;
  message: string;
  source: LeadSource;
  status: EnquiryStatus;
  createdAt: Date;
  customer: { id: string; name: string; email: string | null };
}

export type AssistantLeadStatusCounts = Record<LeadStatus, number>;
export type AssistantEnquiryStatusCounts = Record<EnquiryStatus, number>;

export interface AssistantContextDto {
  business: AssistantBusinessProfileDto;
  totalLeads: number;
  recentLeads: AssistantLeadDto[];
  leadStatusCounts: AssistantLeadStatusCounts;
  totalEnquiries: number;
  recentEnquiries: AssistantEnquiryDto[];
  enquiryStatusCounts: AssistantEnquiryStatusCounts;
}

export type AssistantRelevantData =
  | { type: 'business'; business: AssistantBusinessProfileDto }
  | { type: 'lead-count'; total: number; leadStatusCounts: AssistantLeadStatusCounts }
  | {
      type: 'enquiry-count';
      newEnquiries: number;
      enquiryStatusCounts: AssistantEnquiryStatusCounts;
    }
  | { type: 'recent-enquiries'; enquiries: AssistantEnquiryDto[] };

export interface AssistantChatResponseDto {
  answer: string;
  data?: AssistantRelevantData;
}
