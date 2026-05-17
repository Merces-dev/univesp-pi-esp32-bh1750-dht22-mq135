import { Controller, Get, Query } from "@nestjs/common";
import { SensorsService } from "./sensors.service";

@Controller("sensors")
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get("current")
  getCurrent() {
    return this.sensorsService.getCurrent();
  }

  @Get("history")
  getHistory(@Query("limit") limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.sensorsService.getHistory(Math.min(Math.max(n, 1), 200));
  }

  @Get("stats")
  getStats() {
    return this.sensorsService.getStats();
  }

  @Get("status")
  getDeviceStatus() {
    return { status: this.sensorsService.getDeviceStatus() };
  }
}
