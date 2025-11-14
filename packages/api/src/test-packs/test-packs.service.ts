import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTestPackDto {
  name: string;
  testDefinitionIds: string[];
}

export interface UpdateTestPackDto {
  name?: string;
  testDefinitionIds?: string[];
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class TestPacksService {
  constructor(private prisma: PrismaService) {}

  async createTestPack(dto: CreateTestPackDto, context: AuditContext) {
    const testPack = await this.prisma.testPack.create({
      data: {
        name: dto.name,
        createdById: context.actorId,
        updatedById: context.actorId,
        items: {
          create: dto.testDefinitionIds.map((testDefinitionId, index) => ({
            testDefinitionId,
            order: index + 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            testDefinition: {
              include: {
                section: true,
                method: true,
                specification: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return testPack;
  }

  async listTestPacks(filters?: {
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

    const [testPacks, total] = await Promise.all([
      this.prisma.testPack.findMany({
        where,
        skip,
        take: perPage,
        include: {
          items: {
            include: {
              testDefinition: {
                include: {
                  section: true,
                  method: true,
                  specification: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          updatedBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testPack.count({ where }),
    ]);

    return {
      data: testPacks,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getTestPack(id: string) {
    const testPack = await this.prisma.testPack.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            testDefinition: {
              include: {
                section: true,
                method: true,
                specification: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!testPack) {
      throw new NotFoundException(`TestPack with ID ${id} not found`);
    }

    return testPack;
  }

  async updateTestPack(
    id: string,
    dto: UpdateTestPackDto,
    context: AuditContext,
  ) {
    const existingTestPack = await this.prisma.testPack.findUnique({
      where: { id },
    });

    if (!existingTestPack) {
      throw new NotFoundException(`TestPack with ID ${id} not found`);
    }

    // If testDefinitionIds are provided, delete existing items and create new ones
    if (dto.testDefinitionIds) {
      await this.prisma.testPackItem.deleteMany({
        where: { testPackId: id },
      });
    }

    const testPack = await this.prisma.testPack.update({
      where: { id },
      data: {
        name: dto.name,
        updatedById: context.actorId,
        ...(dto.testDefinitionIds && {
          items: {
            create: dto.testDefinitionIds.map((testDefinitionId, index) => ({
              testDefinitionId,
              order: index + 1,
            })),
          },
        }),
      },
      include: {
        items: {
          include: {
            testDefinition: {
              include: {
                section: true,
                method: true,
                specification: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return testPack;
  }

  async deleteTestPack(id: string, context: AuditContext) {
    const testPack = await this.prisma.testPack.findUnique({
      where: { id },
    });

    if (!testPack) {
      throw new NotFoundException(`TestPack with ID ${id} not found`);
    }

    await this.prisma.testPack.delete({
      where: { id },
    });

    return { message: 'TestPack deleted successfully' };
  }
}
