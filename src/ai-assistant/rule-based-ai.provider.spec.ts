import { EnquiryStatus } from '../generated/prisma/enums.js';
import { AssistantContextDto } from './ai-assistant.dto.js';
import {
  createConfiguredAiProvider,
  getConfiguredAiProviderKind,
} from './ai-provider.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';
import { RuleBasedAiProvider } from './rule-based-ai.provider.js';

describe('RuleBasedAiProvider', () => {
  const context: AssistantContextDto = {
    business: {
      id: 'business-1',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: null,
      industry: 'Interior Design',
      location: 'Bengaluru',
    },
    totalLeads: 7,
    recentLeads: [],
    leadStatusCounts: { NEW: 3, CONTACTED: 1, QUALIFIED: 1, CONVERTED: 2, LOST: 0 },
    totalEnquiries: 2,
    recentEnquiries: [
      {
        id: 'enquiry-1',
        message: 'Interested in a consultation',
        source: 'WHATSAPP',
        status: EnquiryStatus.NEW,
        createdAt: new Date('2026-09-29T10:00:00Z'),
        customer: { id: 'customer-1', name: 'Riya Shah', email: 'riya@example.com' },
      },
    ],
    enquiryStatusCounts: { NEW: 2, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
  };

  it('generates deterministic replies for supported prompts', async () => {
    const provider = new RuleBasedAiProvider();
    await expect(
      provider.generateResponse(context, 'How many leads do I have?'),
    ).resolves.toMatchObject({ answer: 'You have 7 leads in total.' });
    await expect(
      provider.generateResponse(context, 'How many new enquiries?'),
    ).resolves.toMatchObject({ answer: 'You have 2 new enquiries.' });
    await expect(
      provider.generateResponse(context, 'How many converted leads?'),
    ).resolves.toMatchObject({ answer: 'You have 2 converted leads.' });
    await expect(
      provider.generateResponse(context, 'Show my recent enquiries'),
    ).resolves.toMatchObject({
      answer: 'Here are your 1 most recent enquiry.',
      data: { type: 'recent-enquiries', enquiries: [{ id: 'enquiry-1' }] },
    });
    await expect(
      provider.generateResponse(context, 'What is my business name?'),
    ).resolves.toMatchObject({ answer: 'Your business is UrbanNest Interiors.' });
  });

  it('offers supported topics when it cannot interpret the question', async () => {
    const response = await new RuleBasedAiProvider().generateResponse(
      context,
      'Write an ad campaign',
    );
    expect(response.answer).toContain('More AI capabilities will be added later.');
    expect(response.data).toBeUndefined();
  });

  it('defaults to rule-based and supports only configured providers', () => {
    expect(getConfiguredAiProviderKind(undefined)).toBe('rule-based');
    expect(getConfiguredAiProviderKind('gemini')).toBe('gemini');
    expect(createConfiguredAiProvider('rule-based')).toBeInstanceOf(RuleBasedAiProvider);
    expect(() =>
      createConfiguredAiProvider('gemini', {
        GEMINI_API_KEY: '',
      }),
    ).toThrow('GEMINI_API_KEY must be configured when AI_PROVIDER=gemini.');
    expect(() => getConfiguredAiProviderKind('unsupported')).toThrow(
      'Use "rule-based" or "gemini"',
    );
  });

  it('constructs Gemini without making an API request when configured', () => {
    expect(
      createConfiguredAiProvider('gemini', {
        GEMINI_API_KEY: 'test-only-placeholder',
        GEMINI_MODEL: 'gemini-test-model',
      }),
    ).toBeInstanceOf(GeminiAiProvider);
  });
});
