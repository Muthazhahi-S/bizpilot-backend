import { Injectable } from '@nestjs/common';
import { EnquiryStatus, LeadStatus } from '../generated/prisma/enums.js';
import {
  AssistantChatResponseDto,
  AssistantContextDto,
} from './ai-assistant.dto.js';
import type { AiProvider } from './ai-provider.js';

@Injectable()
export class RuleBasedAiProvider implements AiProvider {
  async generateResponse(
    context: AssistantContextDto,
    message: string,
  ): Promise<AssistantChatResponseDto> {
    const normalized = message
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      /\b(converted|won)\b/.test(normalized) &&
      /\b(lead|leads|deal|deals)\b/.test(normalized)
    ) {
      const converted = context.leadStatusCounts[LeadStatus.CONVERTED];
      return {
        answer: `You have ${converted} converted ${converted === 1 ? 'lead' : 'leads'}.`,
        data: {
          type: 'lead-count',
          total: converted,
          leadStatusCounts: context.leadStatusCounts,
        },
      };
    }

    if (
      /\b(new|unread)\b/.test(normalized) &&
      /\b(enquir(?:y|ies)|messages?|requests?)\b/.test(normalized)
    ) {
      const newEnquiries = context.enquiryStatusCounts[EnquiryStatus.NEW];
      return {
        answer: `You have ${newEnquiries} new ${newEnquiries === 1 ? 'enquiry' : 'enquiries'}.`,
        data: {
          type: 'enquiry-count',
          newEnquiries,
          enquiryStatusCounts: context.enquiryStatusCounts,
        },
      };
    }

    if (
      /\b(recent|latest|last|show|list)\b/.test(normalized) &&
      /\benquir(?:y|ies)\b/.test(normalized)
    ) {
      const enquiries = context.recentEnquiries;
      const answer =
        enquiries.length === 0
          ? 'There are no customer enquiries yet.'
          : `Here are your ${enquiries.length} most recent ${enquiries.length === 1 ? 'enquiry' : 'enquiries'}.`;
      return { answer, data: { type: 'recent-enquiries', enquiries } };
    }

    if (
      /\b(business|company|studio|shop)\b/.test(normalized) &&
      /\b(name|called)\b/.test(normalized)
    ) {
      return {
        answer: `Your business is ${context.business.name}.`,
        data: { type: 'business', business: context.business },
      };
    }

    if (
      /\b(how many|number of|count of|total)\b/.test(normalized) &&
      /\bleads?\b/.test(normalized)
    ) {
      const total = context.totalLeads;
      return {
        answer: `You have ${total} ${total === 1 ? 'lead' : 'leads'} in total.`,
        data: { type: 'lead-count', total, leadStatusCounts: context.leadStatusCounts },
      };
    }

    return {
      answer:
        'I can help with lead and enquiry counts, recent enquiries, and your business name. More AI capabilities will be added later.',
    };
  }
}
