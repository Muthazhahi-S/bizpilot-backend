import { Controller, Get, Query } from '@nestjs/common';
import { DashboardResponseDto } from './dashboard.dto.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Query('businessId') businessId?: string): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboard(businessId);
  }
}
