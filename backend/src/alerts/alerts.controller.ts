import { Controller, Get, Put, Param, Body, Query } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { AlertRule } from "./interfaces/alert.interface";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Query("limit") limit?: string) {
    const n = limit ? parseInt(limit, 10) : 20;
    return this.alertsService.getAlerts(Math.min(Math.max(n, 1), 100));
  }

  @Get("rules")
  getRules() {
    return this.alertsService.getRules();
  }

  @Put("rules/:id")
  updateRule(@Param("id") id: string, @Body() updates: Partial<AlertRule>) {
    const rule = this.alertsService.updateRule(id, updates);
    if (!rule) return { error: "Rule not found" };
    return rule;
  }

  @Put(":id/acknowledge")
  acknowledgeAlert(@Param("id") id: string) {
    const result = this.alertsService.acknowledgeAlert(id);
    return { success: result };
  }
}
