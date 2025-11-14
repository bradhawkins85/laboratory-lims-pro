import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSectionDto {
  name: string;
}

export interface UpdateSectionDto {
  name?: string;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async createSection(dto: CreateSectionDto, context: AuditContext) {
    const section = await this.prisma.section.create({
      data: {
        name: dto.name,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
    });

    return section;
  }

  async listSections(filters?: {
    name?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    const [sections, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        skip,
        take: perPage,
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          updatedBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.section.count({ where }),
    ]);

    return {
      data: sections,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getSection(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async updateSection(id: string, dto: UpdateSectionDto, context: AuditContext) {
    const existingSection = await this.prisma.section.findUnique({
      where: { id },
    });

    if (!existingSection) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    const section = await this.prisma.section.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return section;
  }

  async deleteSection(id: string, context: AuditContext) {
    const section = await this.prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    await this.prisma.section.delete({
      where: { id },
    });

    return { message: 'Section deleted successfully' };
  }
}
