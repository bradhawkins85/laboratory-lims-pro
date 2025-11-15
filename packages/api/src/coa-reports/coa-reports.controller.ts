import { Controller, Get, Post, Body, Param, Req, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { COAReportsService } from './coa-reports.service';
import type { BuildCOADto } from './coa-reports.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class COAReportsController {
  constructor(private coaReportsService: COAReportsService) {}

  // Sample-specific COA endpoints
  @Post('samples/:id/coa/preview')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({
    summary: 'Preview COA for sample (returns rendered HTML + JSON snapshot)',
  })
  @ApiResponse({
    status: 200,
    description: 'COA preview generated successfully',
  })
  async previewCOA(@Param('id') sampleId: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.coaReportsService.previewCOA(sampleId, context);
  }

  @Post('samples/:id/coa/export')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({
    summary:
      'Export COA for sample (creates/increments version; returns PDF URL)',
  })
  @ApiResponse({ status: 201, description: 'COA exported successfully' })
  async exportCOA(@Param('id') sampleId: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.coaReportsService.exportCOA(sampleId, context);
  }

  @Get('samples/:id/coa')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({ summary: 'List all COA versions for a sample' })
  @ApiResponse({ status: 200, description: 'COA versions retrieved' })
  async listCOAVersions(@Param('id') sampleId: string) {
    return this.coaReportsService.listCOAReportsForSample(sampleId);
  }

  // COA report endpoints
  @Get('coa/:id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({ summary: 'Get COA report metadata by ID' })
  @ApiResponse({
    status: 200,
    description: 'COA report metadata retrieved successfully',
  })
  async getCOAReportMetadata(@Param('id') id: string) {
    const report = await this.coaReportsService.getCOAReport(id);
    if (!report) {
      return { message: 'COA Report not found' };
    }
    return report;
  }

  @Get('coa/:id/download')
  @Roles(
    Role.ADMIN,
    Role.LAB_MANAGER,
    Role.ANALYST,
    Role.SALES_ACCOUNTING,
    Role.CLIENT,
  )
  @ApiOperation({ summary: 'Download COA PDF by report ID' })
  @ApiResponse({ status: 200, description: 'COA PDF downloaded successfully' })
  async downloadCOAPdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.coaReportsService.getCOAReport(id);
    if (!report) {
      return res.status(404).json({ message: 'COA Report not found' });
    }

    if (!report.pdfKey) {
      // Fallback to HTML if no PDF is stored (for backward compatibility)
      const sampleCode = (report as any).sample?.sampleCode || report.sampleId;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="COA-${sampleCode}-v${report.version}.html"`,
      );
      return res.send(report.htmlSnapshot);
    }

    // Download PDF from storage and stream to response
    try {
      const pdfBuffer = await this.coaReportsService.downloadCOAPdf(
        report.pdfKey,
      );
      const sampleCode = (report as any).sample?.sampleCode || report.sampleId;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="COA-${sampleCode}-v${report.version}.pdf"`,
      );
      return res.send(pdfBuffer);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to download PDF', error: error.message });
    }
  }

  // Legacy endpoints for backward compatibility
  @Post('coa-reports/build')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Build COA (legacy endpoint)' })
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

  @Post('coa-reports/:id/finalize')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Finalize COA (legacy endpoint)' })
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

  @Post('coa-reports/:id/approve')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Approve COA (legacy endpoint)' })
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

  @Get('coa-reports/:id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({ summary: 'Get COA report by ID (legacy endpoint)' })
  async getCOAReport(@Param('id') id: string) {
    return this.coaReportsService.getCOAReport(id);
  }

  @Get('coa-reports/sample/:sampleId')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({
    summary: 'List COA reports for sample (legacy endpoint)',
  })
  async listCOAReportsForSample(@Param('sampleId') sampleId: string) {
    return this.coaReportsService.listCOAReportsForSample(sampleId);
  }

  @Get('coa-reports/sample/:sampleId/latest')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  @ApiOperation({
    summary: 'Get latest COA report for sample (legacy endpoint)',
  })
  async getLatestCOAReport(@Param('sampleId') sampleId: string) {
    return this.coaReportsService.getLatestCOAReport(sampleId);
  }
}
