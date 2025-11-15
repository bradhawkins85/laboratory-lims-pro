import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { LabSettings } from '@prisma/client';

export interface UpdateLabSettingsDto {
  labName?: string;
  labLogoUrl?: string;
  disclaimerText?: string;
  coaTemplateSettings?: {
    visibleFields?: string[];
    labelOverrides?: Record<string, string>;
    columnOrder?: string[];
  };
}

@Injectable()
export class LabSettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get the current lab settings (singleton)
   * If no settings exist, create default settings
   */
  async getSettings(): Promise<LabSettings | null> {
    const settings = await this.prisma.labSettings.findFirst();

    // If no settings exist, this is handled at the application level
    // The service will return null and the caller should handle creating default settings
    return settings;
  }

  /**
   * Update lab settings
   */
  async updateSettings(
    dto: UpdateLabSettingsDto,
    context: AuditContext,
  ): Promise<LabSettings> {
    // Get existing settings
    const existing = await this.prisma.labSettings.findFirst();

    let settings: LabSettings;

    if (!existing) {
      // Create new settings if none exist
      settings = await this.prisma.labSettings.create({
        data: {
          labName: dto.labName || 'Laboratory LIMS Pro',
          labLogoUrl: dto.labLogoUrl,
          disclaimerText: dto.disclaimerText,
          coaTemplateSettings: dto.coaTemplateSettings as any,
          createdById: context.actorId,
          updatedById: context.actorId,
        },
      });

      await this.auditService.logCreate(
        context,
        'LabSettings',
        settings.id,
        settings,
      );
    } else {
      // Update existing settings
      settings = await this.prisma.labSettings.update({
        where: { id: existing.id },
        data: {
          ...(dto.labName !== undefined && { labName: dto.labName }),
          ...(dto.labLogoUrl !== undefined && { labLogoUrl: dto.labLogoUrl }),
          ...(dto.disclaimerText !== undefined && {
            disclaimerText: dto.disclaimerText,
          }),
          ...(dto.coaTemplateSettings !== undefined && {
            coaTemplateSettings: dto.coaTemplateSettings as any,
          }),
          updatedById: context.actorId,
        },
      });

      await this.auditService.logUpdate(
        context,
        'LabSettings',
        settings.id,
        existing,
        settings,
      );
    }

    return settings;
  }

  /**
   * Get or create default settings
   */
  async getOrCreateSettings(context: AuditContext): Promise<LabSettings> {
    let settings = await this.getSettings();

    if (!settings) {
      settings = await this.updateSettings(
        {
          labName: 'Laboratory LIMS Pro',
          disclaimerText:
            'This Certificate of Analysis is for the sample as received and tested. Results apply only to the sample tested.',
        },
        context,
      );
    }

    return settings;
  }
}
