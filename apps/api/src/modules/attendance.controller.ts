import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsIn, IsISO8601, IsString } from "class-validator";
import { CurrentAuth } from "./auth";
import { HrDataStore } from "./hr-data.store";

class ClockDto {
  @IsIn(["clock_in", "clock_out"])
  type!: "clock_in" | "clock_out";

  @IsISO8601()
  at!: string;
}

class WorkModeDto {
  @IsString()
  date!: string;

  @IsIn(["office", "smartworking"])
  mode!: "office" | "smartworking";
}

@Controller("attendance")
export class AttendanceController {
  constructor(private readonly store: HrDataStore) {}

  @Post("clock")
  async clock(@CurrentAuth() auth: { userId: string }, @Body() dto: ClockDto): Promise<unknown> {
    return this.store.addTimeEntry(auth.userId, dto.type, dto.at);
  }

  @Post("mode")
  async setMode(@CurrentAuth() auth: { userId: string }, @Body() dto: WorkModeDto): Promise<unknown> {
    return this.store.upsertWorkMode(auth.userId, dto.date, dto.mode);
  }

  @Get("entries")
  async entries(@CurrentAuth() auth: { userId: string }, @Query("userId") userId?: string): Promise<unknown> {
    return this.store.listTimeEntries(userId ?? auth.userId);
  }

  @Get("summary")
  async summary(@CurrentAuth() auth: { userId: string }, @Query("userId") userId?: string): Promise<unknown> {
    return this.store.listWorkdaySummary(userId ?? auth.userId);
  }
}
