import { Body, Controller, Post } from '@nestjs/common';
import type {
  AssistantChatRequestDto,
  AssistantChatResponseDto,
} from './ai-assistant.dto.js';
import { AiAssistantService } from './ai-assistant.service.js';

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  chat(@Body() request: AssistantChatRequestDto): Promise<AssistantChatResponseDto> {
    return this.aiAssistantService.chat(request);
  }
}
