import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  CreateLeadDto,
  LeadFiltersDto,
  LeadResponseDto,
  UpdateLeadDto,
} from './leads.dto.js';
import { LeadsService } from './leads.service.js';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@Query() filters: LeadFiltersDto): Promise<LeadResponseDto[]> {
    return this.leadsService.findAll(filters);
  }

  @Post()
  create(@Body() dto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return this.leadsService.update(id, dto);
  }
}
