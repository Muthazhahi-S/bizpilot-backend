import type {
  AssistantChatResponseDto,
  AssistantContextDto,
} from './ai-assistant.dto.js';
import { GeminiAiProvider, GoogleGeminiClient } from './gemini-ai.provider.js';
import { RuleBasedAiProvider } from './rule-based-ai.provider.js';

export interface AiProvider {
  generateResponse(
    context: AssistantContextDto,
    message: string,
  ): Promise<AssistantChatResponseDto>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AiProviderKind = 'rule-based' | 'gemini';

export function getConfiguredAiProviderKind(
  configuredValue = process.env.AI_PROVIDER,
): AiProviderKind {
  const provider = configuredValue?.trim() || 'rule-based';
  if (provider === 'rule-based' || provider === 'gemini') {
    return provider;
  }
  throw new Error(
    `Unsupported AI_PROVIDER "${provider}". Use "rule-based" or "gemini".`,
  );
}

export function createConfiguredAiProvider(
  kind: AiProviderKind,
  environment: NodeJS.ProcessEnv = process.env,
): AiProvider {
  if (kind === 'rule-based') return new RuleBasedAiProvider();
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY must be configured when AI_PROVIDER=gemini.');
  }
  const model = environment.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  return new GeminiAiProvider(new GoogleGeminiClient(apiKey), model);
}
