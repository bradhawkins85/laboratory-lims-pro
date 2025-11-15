-- CreateTable
CREATE TABLE "LabSettings" (
    "id" UUID NOT NULL,
    "labName" TEXT NOT NULL DEFAULT 'Laboratory LIMS Pro',
    "labLogoUrl" TEXT,
    "disclaimerText" TEXT,
    "coaTemplateSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "LabSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabSettings_createdById_idx" ON "LabSettings"("createdById");

-- CreateIndex
CREATE INDEX "LabSettings_updatedById_idx" ON "LabSettings"("updatedById");

-- AddForeignKey
ALTER TABLE "LabSettings" ADD CONSTRAINT "LabSettings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSettings" ADD CONSTRAINT "LabSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
