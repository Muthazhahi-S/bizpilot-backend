import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  AI_PROVIDER,
  createConfiguredAiProvider,
  getConfiguredAiProviderKind,
} from './ai-provider.js';
import { AiAssistantController } from './ai-assistant.controller.js';
import { AiAssistantContextService } from './ai-assistant-context.service.js';
import { AiAssistantService } from './ai-assistant.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantContextService,
    AiAssistantService,
    {
      provide: AI_PROVIDER,
      useFactory: () => createConfiguredAiProvider(getConfiguredAiProviderKind()),
    },
  ],
})
export class AiAssistantModule {}
