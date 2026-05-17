import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MqttModule } from "./mqtt/mqtt.module";
import { SensorsModule } from "./sensors/sensors.module";
import { AlertsModule } from "./alerts/alerts.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MqttModule,
    SensorsModule,
    AlertsModule,
  ],
})
export class AppModule {}
