import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequireModule } from '../../common/decorators/auth.decorator';

@Controller('dashboard')
@RequireModule('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Query('dias') dias?: string) {
    return this.dashboardService.getDashboard(dias ? Number(dias) : 7);
  }
}
