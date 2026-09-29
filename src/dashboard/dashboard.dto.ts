import { EnquiryStatus, LeadSource, LeadStatus } from '../generated/prisma/enums.js';

export interface RecentEnquiryDto {
  id: string;
  message: string;
  source: LeadSource;
  status: EnquiryStatus;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
}

export type LeadPipelineCountsDto = Record<LeadStatus, number>;

export interface DashboardResponseDto {
  businessId: string;
  totalLeads: number;
  newEnquiries: number;
  contactedLeads: number;
  convertedLeads: number;
  recentEnquiries: RecentEnquiryDto[];
  leadPipeline: LeadPipelineCountsDto;
}
