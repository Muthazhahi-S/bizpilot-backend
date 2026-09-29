import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AssistantContextDto } from './ai-assistant.dto.js';
import { AiAssistantContextService } from './ai-assistant-context.service.js';
import { AI_PROVIDER } from './ai-provider.js';
import type { AiProvider } from './ai-provider.js';
import { AiAssistantService } from './ai-assistant.service.js';

describe('AiAssistantService', () => {
  const context: AssistantContextDto = {
    business: {
      id: 'bizpilot-demo-urbannest',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: null,
      industry: 'Interior Design',
      location: 'Bengaluru',
    },
    totalLeads: 7,
    recentLeads: [],
    leadStatusCounts: { NEW: 3, CONTACTED: 1, QUALIFIED: 1, CONVERTED: 2, LOST: 0 },
    totalEnquiries: 3,
    recentEnquiries: [],
    enquiryStatusCounts: { NEW: 2, IN_PROGRESS: 1, RESOLVED: 0, CLOSED: 0 },
  };
  const contextService = { getContext: vi.fn() };
  const provider: AiProvider = { generateResponse: vi.fn() };
  let service: AiAssistantService;

  beforeEach(async () => {
    contextService.getContext.mockReset().mockResolvedValue(context);
    vi.mocked(provider.generateResponse).mockReset().mockResolvedValue({
      answer: 'You have 7 leads in total.',
    });
    const module = await Test.createTestingModule({
      providers: [
        AiAssistantService,
        { provide: AiAssistantContextService, useValue: contextService },
        { provide: AI_PROVIDER, useValue: provider },
      ],
    }).compile();
    service = module.get(AiAssistantService);
  });

  it('retrieves structured context and delegates response generation to the provider', async () => {
    const response = await service.chat({
      businessId: context.business.id,
      message: ' How many leads do I have? ',
    });

    expect(response).toEqual({ answer: 'You have 7 leads in total.' });
    expect(contextService.getContext).toHaveBeenCalledWith(context.business.id);
    expect(provider.generateResponse).toHaveBeenCalledWith(
      context,
      'How many leads do I have?',
    );
  });

  it('validates request shape, business id, and message before loading context', async () => {
    await expect(service.chat(null as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.chat({ businessId: '', message: 'Hello' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.chat({ businessId: context.business.id, message: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.chat({ businessId: context.business.id, message: 'x'.repeat(2001) }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(contextService.getContext).not.toHaveBeenCalled();
    expect(provider.generateResponse).not.toHaveBeenCalled();
  });

  it('propagates context retrieval errors without masking HTTP exceptions', async () => {
    const error = new Error('business not found');
    contextService.getContext.mockRejectedValueOnce(error);
    await expect(
      service.chat({ businessId: context.business.id, message: 'Hello' }),
    ).rejects.toBe(error);
    expect(provider.generateResponse).not.toHaveBeenCalled();
  });
});
