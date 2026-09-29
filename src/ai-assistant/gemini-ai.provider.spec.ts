import {
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnquiryStatus } from '../generated/prisma/enums.js';
import type { AssistantContextDto } from './ai-assistant.dto.js';
import {
  GeminiAiProvider,
  type GeminiInteractionClient,
  type GeminiInteractionRequest,
} from './gemini-ai.provider.js';

describe('GeminiAiProvider', () => {
  const context: AssistantContextDto = {
    business: {
      id: 'business-1',
      name: 'UrbanNest Interiors',
      email: 'ananya@urbannest.in',
      phone: null,
      industry: 'Interior Design',
      location: 'Bengaluru',
    },
    totalLeads: 3,
    recentLeads: [
      {
        id: 'lead-1',
        service: 'Kitchen design',
        source: 'WEBSITE',
        status: 'NEW',
        message: 'Need a renovation estimate.',
        createdAt: new Date('2026-09-29T10:00:00Z'),
        customer: { id: 'customer-1', name: 'Riya Shah', email: 'riya@example.com' },
      },
    ],
    leadStatusCounts: { NEW: 2, CONTACTED: 1, QUALIFIED: 0, CONVERTED: 0, LOST: 0 },
    totalEnquiries: 2,
    recentEnquiries: [
      {
        id: 'enquiry-1',
        message: 'Interested in a consultation.',
        source: 'WHATSAPP',
        status: EnquiryStatus.NEW,
        createdAt: new Date('2026-09-29T11:00:00Z'),
        customer: { id: 'customer-2', name: 'Asha Rao', email: null },
      },
    ],
    enquiryStatusCounts: { NEW: 1, IN_PROGRESS: 1, RESOLVED: 0, CLOSED: 0 },
  };

  it('sends full context and question with grounding instructions and returns generated text', async () => {
    const createInteraction = vi.fn().mockResolvedValue({ output_text: 'You have 3 leads.' });
    const client: GeminiInteractionClient = { createInteraction };
    const provider = new GeminiAiProvider(client, 'gemini-3.8-flash');

    await expect(
      provider.generateResponse(context, 'How many leads do I have?'),
    ).resolves.toEqual({ answer: 'You have 3 leads.' });

    expect(createInteraction).toHaveBeenCalledOnce();
    const request = createInteraction.mock.calls[0]![0] as GeminiInteractionRequest;
    expect(request.model).toBe('gemini-3.8-flash');
    expect(request.system_instruction).toContain(
      'using only the supplied businessContext JSON',
    );
    expect(request.system_instruction).toContain('cannot access databases');
    expect(request).not.toHaveProperty('tools');
    expect(request).not.toHaveProperty('temperature');
    expect(request.generation_config).toEqual({ max_output_tokens: 512 });
    expect(JSON.parse(request.input)).toEqual({
      businessContext: JSON.parse(JSON.stringify(context)),
      userQuestion: 'How many leads do I have?',
    });
  });

  it('maps Gemini API failures to a clean 503 without exposing provider errors', async () => {
    const createInteraction = vi
      .fn()
      .mockRejectedValue(new Error('provider error with sensitive details'));
    const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');

    await expect(
      provider.generateResponse(context, 'How many leads?'),
    ).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      message: 'The Gemini assistant is temporarily unavailable. Please try again shortly.',
    });
    expect(createInteraction).toHaveBeenCalledOnce();
  });

  it('retries a 503 after two seconds and returns a successful second response', async () => {
    vi.useFakeTimers();
    try {
      const createInteraction = vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('High demand'), { status: 503 }))
        .mockResolvedValueOnce({ output_text: 'You have 3 leads.' });
      const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');
      const response = provider.generateResponse(context, 'How many leads?');

      await vi.advanceTimersByTimeAsync(2_000);
      await expect(response).resolves.toEqual({ answer: 'You have 3 leads.' });
      expect(createInteraction).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops after three 503 attempts with exponential backoff', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      const createInteraction = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('High demand'), { status: 503 }));
      const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');
      const response = provider.generateResponse(context, 'How many leads?');
      const rejectedResponse = expect(response).rejects.toMatchObject({
        constructor: ServiceUnavailableException,
        message: 'The Gemini assistant is temporarily unavailable. Please try again shortly.',
      });

      await vi.advanceTimersByTimeAsync(2_000);
      expect(createInteraction).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(4_000);
      await rejectedResponse;
      expect(createInteraction).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry non-503 errors', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const createInteraction = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('Invalid request'), { status: 400 }));
    const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');

    await expect(
      provider.generateResponse(context, 'How many leads?'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createInteraction).toHaveBeenCalledOnce();
  });

  it('does not retry 429 and returns a friendly rate-limit response', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const createInteraction = vi.fn().mockRejectedValue(
      Object.assign(
        new Error('Raw Gemini error with credential=secret-value'),
        { status: 429, name: 'RateLimitError' },
      ),
    );
    const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');

    const response = provider.generateResponse(context, 'How many leads?');
    await expect(response).rejects.toMatchObject({
      status: 429,
      message: 'The AI assistant has reached its current usage limit. Please try again later.',
    });
    await expect(response).rejects.toBeInstanceOf(HttpException);
    expect(createInteraction).toHaveBeenCalledOnce();
  });

  it('recognizes RateLimitError without an HTTP status', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const createInteraction = vi.fn().mockRejectedValue(
      Object.assign(new Error('Raw Gemini error'), { name: 'RateLimitError' }),
    );
    const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');

    const response = provider.generateResponse(context, 'How many leads?');
    await expect(response).rejects.toMatchObject({
      message: 'The AI assistant has reached its current usage limit. Please try again later.',
    });
    await expect(response).rejects.toBeInstanceOf(HttpException);
    expect(createInteraction).toHaveBeenCalledOnce();
  });

  it('logs safe Gemini error metadata before returning the generic 503', async () => {
    const logger = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const createInteraction = vi.fn().mockRejectedValue(
      Object.assign(
        new Error(
          'Invalid key AIzaSyD1234567890123456789012345678901234; GEMINI_API_KEY=demo-api-secret; DATABASE_URL=postgres://user:db-password@localhost/bizpilot; password=demo-password; authorization: Bearer demo-token',
        ),
        { status: 401, code: 'UNAUTHENTICATED' },
      ),
    );
    const provider = new GeminiAiProvider({ createInteraction }, 'gemini-test-model');
    logger.mockClear();

    await expect(
      provider.generateResponse(context, 'How many leads?'),
    ).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      message: 'The Gemini assistant is temporarily unavailable. Please try again shortly.',
    });

    expect(logger).toHaveBeenCalledOnce();
    const loggedMessage = logger.mock.calls[0]![0] as string;
    expect(loggedMessage).toContain('"name":"Error"');
    expect(loggedMessage).toContain('"status":401');
    expect(loggedMessage).toContain('"code":"UNAUTHENTICATED"');
    expect(loggedMessage).toContain('[REDACTED]');
    expect(loggedMessage).toContain('DATABASE_URL=[REDACTED]');
    expect(loggedMessage).not.toContain('AIzaSyD');
    expect(loggedMessage).not.toContain('demo-api-secret');
    expect(loggedMessage).not.toContain('demo-password');
    expect(loggedMessage).not.toContain('demo-token');
    expect(loggedMessage).not.toContain('db-password');
    expect(loggedMessage).not.toContain('localhost');
  });

  it('maps empty model responses to a clean 503', async () => {
    const client: GeminiContentClient = {
      createInteraction: vi.fn().mockResolvedValue({ output_text: '  ' }),
    };
    await expect(
      new GeminiAiProvider(client, 'gemini-test-model').generateResponse(
        context,
        'How many leads?',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
