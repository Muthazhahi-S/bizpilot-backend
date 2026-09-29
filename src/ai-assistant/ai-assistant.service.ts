import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  AssistantChatRequestDto,
  AssistantChatResponseDto,
} from './ai-assistant.dto.js';
import { AiAssistantContextService } from './ai-assistant-context.service.js';
import { AI_PROVIDER } from './ai-provider.js';
import type { AiProvider } from './ai-provider.js';

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly contextService: AiAssistantContextService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async chat(request: AssistantChatRequestDto): Promise<AssistantChatResponseDto> {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new BadRequestException('Chat request must be an object.');
    }
    const businessId = this.requireText(request.businessId, 'businessId', 200);
    const message = this.requireText(request.message, 'message', 2000);
    const context = await this.contextService.getContext(businessId);
    return this.provider.generateResponse(context, message);
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
}
