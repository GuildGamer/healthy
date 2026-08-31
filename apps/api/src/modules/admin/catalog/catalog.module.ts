import { Module } from '@nestjs/common';
import { AdminCatalogController } from './catalog.controller.js';
import { AdminCatalogService } from './catalog.service.js';

@Module({
  controllers: [AdminCatalogController],
  providers: [AdminCatalogService],
})
export class AdminCatalogModule {}
