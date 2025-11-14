import { Test, TestingModule } from '@nestjs/testing';
import { AuditContextMiddleware } from './audit-context.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response } from 'express';

describe('AuditContextMiddleware', () => {
  let middleware: AuditContextMiddleware;
  let prismaService: PrismaService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditContextMiddleware,
        {
          provide: PrismaService,
          useValue: {
            $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    middleware = module.get<AuditContextMiddleware>(AuditContextMiddleware);
    prismaService = module.get<PrismaService>(PrismaService);

    mockRequest = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as Partial<Request>;

    mockResponse = {} as Partial<Response>;
    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set audit context when user is present', async () => {
    // Arrange
    const user = { sub: 'user-123', email: 'test@example.com' };
    (mockRequest as any).user = user;
    mockRequest.headers = { 'user-agent': 'test-agent' };

    // Act
    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Assert
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledTimes(4);
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.actor_id'),
    );
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.actor_email'),
    );
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.ip'),
    );
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.user_agent'),
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle x-forwarded-for header', async () => {
    // Arrange
    const user = { sub: 'user-123', email: 'test@example.com' };
    (mockRequest as any).user = user;
    mockRequest.headers = {
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      'user-agent': 'test-agent',
    };

    // Act
    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Assert
    expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('192.168.1.1'),
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should skip setting context when user is not present', async () => {
    // Act
    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Assert
    expect(prismaService.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should continue even if setting context fails', async () => {
    // Arrange
    const user = { sub: 'user-123', email: 'test@example.com' };
    (mockRequest as any).user = user;
    (prismaService.$executeRawUnsafe as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    );

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Act
    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
