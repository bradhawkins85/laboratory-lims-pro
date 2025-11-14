import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Extend the Express Request type to include the user property
interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

/**
 * Middleware to set audit context in PostgreSQL session variables
 * This allows database triggers to capture user context automatically
 */
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract user from JWT (set by passport jwt strategy)
    const reqWithUser = req as RequestWithUser;
    const user = reqWithUser.user;

    if (user && user.sub && user.email) {
      // Get client IP (handle proxy scenarios)
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      // Get user agent
      const userAgent = req.headers['user-agent'] || 'unknown';

      try {
        // Set session variables that will be read by database triggers
        // These are transaction-scoped and will be cleared after the transaction
        await this.prisma.$executeRawUnsafe(`
          SELECT set_config('app.actor_id', '${user.sub}', true);
        `);

        await this.prisma.$executeRawUnsafe(`
          SELECT set_config('app.actor_email', '${user.email}', true);
        `);

        await this.prisma.$executeRawUnsafe(`
          SELECT set_config('app.ip', '${ip}', true);
        `);

        await this.prisma.$executeRawUnsafe(`
          SELECT set_config('app.user_agent', '${userAgent}', true);
        `);
      } catch (error) {
        // Log error but don't block the request
        console.error('Failed to set audit context:', error);
      }
    }

    next();
  }
}
