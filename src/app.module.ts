import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module.js';

@Module({
  imports: [DashboardModule, LeadsModule, EnquiriesModule, BusinessesModule, AiAssistantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
