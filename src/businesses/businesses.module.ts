import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BusinessesController } from './businesses.controller.js';
import { BusinessesService } from './businesses.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
