import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { SensorsGateway } from './sensors.gateway';

@Module({
  providers: [SensorsService, SensorsGateway],
  controllers: [SensorsController],
  exports: [SensorsService],
})
export class SensorsModule {}
