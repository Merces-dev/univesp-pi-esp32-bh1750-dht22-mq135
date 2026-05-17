import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { OnEvent } from "@nestjs/event-emitter";
import { Server } from "socket.io";
import { Logger } from "@nestjs/common";
import { ProcessedTelemetry } from "./interfaces/telemetry.interface";
import { TriggeredAlert } from "../alerts/interfaces/alert.interface";

@WebSocketGateway({ cors: { origin: "*" } })
export class SensorsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SensorsGateway.name);

  @OnEvent("telemetry.processed")
  handleProcessedTelemetry(data: ProcessedTelemetry): void {
    this.server.emit("sensor:data", data);
  }

  @OnEvent("alert.triggered")
  handleAlert(alert: TriggeredAlert): void {
    this.server.emit("sensor:alert", alert);
  }

  @OnEvent("device.status.changed")
  handleDeviceStatus(status: string): void {
    this.server.emit("sensor:status", { status });
  }
}
