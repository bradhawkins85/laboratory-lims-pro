# Laboratory LIMS Pro

A comprehensive Laboratory Information Management System built with modern web technologies.

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: NextAuth.js with JWT sessions

### Backend/API
- **Framework**: NestJS with TypeScript
- **API Style**: REST with OpenAPI/Swagger specification
- **Authentication**: JWT with Passport.js
- **Authorization**: Role-Based Access Control (RBAC)

### Database
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Primary Keys**: UUID
- **Flexible Data**: JSONB for metadata and audit snapshots

### File Storage
- **Object Storage**: MinIO (S3-compatible)
- **Use Cases**: PDF reports, attachments, lab documents

### PDF Generation
- **Engine**: Puppeteer (Headless Chromium)
- **Method**: Server-side HTML templates rendered to PDF

### Logging & Telemetry
- **Logger**: Pino
- **Format**: Structured JSON logs
- **Transport**: pino-pretty for development

### Testing
- **Unit Tests**: Jest
- **E2E Tests**: Playwright
- **Test Data**: Seed scripts and factory patterns

### Containerization
- **Orchestration**: Docker Compose
- **Services**:
  - `web`: Next.js frontend (port 3002)
  - `api`: NestJS backend (port 3000)
  - `postgres`: PostgreSQL database (port 5432)
  - `minio`: Object storage (ports 9000, 9001)
  - `chrome`: Browserless Chrome for PDF generation (port 3001)

### CI/CD
- **Platform**: GitHub Actions
- **Jobs**:
  - Linting (ESLint)
  - Type checking (TypeScript)
  - Unit & E2E testing
  - Build verification
  - Container image publishing to GitHub Container Registry

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bradhawkins85/laboratory-lims-pro.git
   cd laboratory-lims-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # API
   cp packages/api/.env.example packages/api/.env
   
   # Web
   cp packages/web/.env.example packages/web/.env
   ```

4. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate --workspace=api
   ```

6. **Generate Prisma Client**
   ```bash
   npm run prisma:generate --workspace=api
   ```

### Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

Or start them individually:
```bash
# Frontend (Next.js)
npm run dev:web

# Backend (NestJS)
npm run dev:api
```

### Building

Build both packages:
```bash
npm run build
```

Or build individually:
```bash
npm run build:web
npm run build:api
```

## 📚 API Documentation

Once the API is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000

## 🧪 Testing

Run tests for all packages:
```bash
npm test
```

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control (RBAC).

**User Roles**:
- `ADMIN`: Full system access
- `MANAGER`: Lab management capabilities
- `TECHNICIAN`: Lab operations and testing
- `USER`: Basic access

**Protected Routes**: All API endpoints require authentication by default. Use the `@Public()` decorator for public endpoints.

## 📦 Project Structure

```
laboratory-lims-pro/
├── packages/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/        # Authentication & authorization
│   │   │   ├── config/      # Configuration (logger, etc.)
│   │   │   ├── prisma/      # Prisma service
│   │   │   ├── modules/     # Feature modules
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # Next.js frontend
│       ├── app/             # App Router pages
│       ├── components/      # React components
│       ├── lib/             # Utilities
│       ├── Dockerfile
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI/CD
├── docker-compose.yml
├── package.json             # Root package.json (workspace)
└── README.md
```

## 🗄️ Database Schema

The system uses Prisma with PostgreSQL. Key models:
- **User**: Authentication and user management
- **Sample**: Laboratory samples
- **Test**: Lab tests performed on samples
- **Report**: Generated reports with PDF links
- **Attachment**: File attachments

All models use UUID primary keys and include JSONB fields for flexible metadata and audit snapshots.

## 🐳 Docker Services

- **postgres**: PostgreSQL database with health checks
- **minio**: S3-compatible object storage for files
- **chrome**: Headless browser for PDF generation
- **api**: NestJS backend API
- **web**: Next.js frontend application

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
