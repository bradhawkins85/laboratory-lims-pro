import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { COAReportsService } from './coa-reports.service';
import type { BuildCOADto } from './coa-reports.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

@Controller('coa-reports')
export class COAReportsController {
  constructor(private coaReportsService: COAReportsService) {}

  @Post('build')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async buildCOA(@Body() dto: BuildCOADto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.coaReportsService.buildCOA(dto, context);
  }

  @Post(':id/finalize')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async finalizeCOA(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.coaReportsService.finalizeCOA(id, context);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async approveCOA(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.coaReportsService.approveCOA(id, context);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getCOAReport(@Param('id') id: string) {
    return this.coaReportsService.getCOAReport(id);
  }

  @Get('sample/:sampleId')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async listCOAReportsForSample(@Param('sampleId') sampleId: string) {
    return this.coaReportsService.listCOAReportsForSample(sampleId);
  }

  @Get('sample/:sampleId/latest')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getLatestCOAReport(@Param('sampleId') sampleId: string) {
    return this.coaReportsService.getLatestCOAReport(sampleId);
  }

  @Get(':id/preview')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async previewCOA(@Param('id') id: string, @Res() res: Response) {
    const report = await this.coaReportsService.getCOAReport(id);
    if (!report) {
      return res.status(404).json({ message: 'COA Report not found' });
    }
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(report.htmlSnapshot);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async downloadCOA(@Param('id') id: string, @Res() res: Response) {
    const report = await this.coaReportsService.getCOAReport(id);
    if (!report) {
      return res.status(404).json({ message: 'COA Report not found' });
    }
    
    // For now, return the HTML. In production, this would generate a PDF
    // using a library like puppeteer or wkhtmltopdf
    const sampleCode = (report as any).sample?.sampleCode || report.sampleId;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="COA-${sampleCode}-v${report.version}.html"`,
    );
    return res.send(report.htmlSnapshot);
  }
}
