import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { BusinessProfileDto, UpdateBusinessProfileDto } from './businesses.dto.js';
import { BusinessesService } from './businesses.service.js';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BusinessProfileDto> {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfileDto> {
    return this.businessesService.update(id, dto);
  }
}
