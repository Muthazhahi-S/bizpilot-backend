import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  CreateEnquiryDto,
  EnquiryFiltersDto,
  EnquiryResponseDto,
  UpdateEnquiryDto,
} from './enquiries.dto.js';
import { EnquiriesService } from './enquiries.service.js';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Get()
  findAll(@Query() filters: EnquiryFiltersDto): Promise<EnquiryResponseDto[]> {
    return this.enquiriesService.findAll(filters);
  }

  @Post()
  create(@Body() dto: CreateEnquiryDto): Promise<EnquiryResponseDto> {
    return this.enquiriesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryDto,
  ): Promise<EnquiryResponseDto> {
    return this.enquiriesService.update(id, dto);
  }
}
