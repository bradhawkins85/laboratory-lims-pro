/**
 * Shared TypeScript types mirroring Prisma models + DTOs
 * These types are shared between API and Web packages
 */

// ============================================================================
// ENUMS
// ============================================================================

export type Role =
  | 'ADMIN'
  | 'LAB_MANAGER'
  | 'ANALYST'
  | 'SALES_ACCOUNTING'
  | 'CLIENT';

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type TestAssignmentStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REVIEWED'
  | 'RELEASED';

export type COAReportStatus = 'DRAFT' | 'FINAL' | 'SUPERSEDED';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  clientId: string;
  client?: Client;
  needByDate?: string;
  mcdDate?: string;
  status: JobStatus;
  quoteNumber?: string;
  poNumber?: string;
  soNumber?: string;
  amountExTax?: number;
  invoiced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Method {
  id: string;
  code: string;
  name: string;
  unit?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Specification {
  id: string;
  code: string;
  name: string;
  target?: string;
  min?: number;
  max?: number;
  unit?: string;
  oosRule?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestDefinition {
  id: string;
  name: string;
  sectionId: string;
  section?: Section;
  methodId: string;
  method?: Method;
  specificationId?: string;
  specification?: Specification;
  defaultDueDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestPack {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sample {
  id: string;
  sampleCode: string;
  jobId: string;
  job?: Job;
  clientId: string;
  client?: Client;
  dateReceived: string;
  dateDue?: string;
  releaseDate?: string;
  rmSupplier?: string;
  sampleDescription?: string;
  uinCode?: string;
  sampleBatch?: string;
  temperatureOnReceiptC?: number;
  storageConditions?: string;
  comments?: string;
  expiredRawMaterial: boolean;
  postIrradiatedRawMaterial: boolean;
  stabilityStudy: boolean;
  urgent: boolean;
  allMicroTestsAssigned: boolean;
  allChemistryTestsAssigned: boolean;
  released: boolean;
  retest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestAssignment {
  id: string;
  sampleId: string;
  sample?: Sample;
  testDefinitionId?: string;
  testDefinition?: TestDefinition;
  sectionId: string;
  section?: Section;
  methodId: string;
  method?: Method;
  specificationId?: string;
  specification?: Specification;
  customTestName?: string;
  dueDate?: string;
  analystId?: string;
  analyst?: User;
  status: TestAssignmentStatus;
  testDate?: string;
  result?: string;
  resultUnit?: string;
  oos: boolean;
  comments?: string;
  invoiceNote?: string;
  precision?: string;
  linearity?: string;
  chkById?: string;
  checker?: User;
  chkDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface COAReport {
  id: string;
  version: number;
  sampleId: string;
  sample?: Sample;
  status: COAReportStatus;
  dataSnapshot: any; // JSON object
  htmlSnapshot: string;
  pdfKey?: string;
  reporterId?: string;
  reporter?: User;
  reportDate?: string;
  approverId?: string;
  approver?: User;
  approvalDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  changedFields?: any; // JSON object
  oldValues?: any; // JSON object
  newValues?: any; // JSON object
  actorId?: string;
  actor?: User;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  user: User;
}

export interface CreateSampleDto {
  sampleCode: string;
  jobId: string;
  clientId: string;
  dateReceived: string;
  dateDue?: string;
  rmSupplier?: string;
  sampleDescription?: string;
  uinCode?: string;
  sampleBatch?: string;
  temperatureOnReceiptC?: number;
  storageConditions?: string;
  comments?: string;
  expiredRawMaterial?: boolean;
  postIrradiatedRawMaterial?: boolean;
  stabilityStudy?: boolean;
  urgent?: boolean;
  allMicroTestsAssigned?: boolean;
  allChemistryTestsAssigned?: boolean;
}

export interface UpdateSampleDto {
  sampleCode?: string;
  dateDue?: string;
  releaseDate?: string;
  rmSupplier?: string;
  sampleDescription?: string;
  uinCode?: string;
  sampleBatch?: string;
  temperatureOnReceiptC?: number;
  storageConditions?: string;
  comments?: string;
  expiredRawMaterial?: boolean;
  postIrradiatedRawMaterial?: boolean;
  stabilityStudy?: boolean;
  urgent?: boolean;
  allMicroTestsAssigned?: boolean;
  allChemistryTestsAssigned?: boolean;
  released?: boolean;
  retest?: boolean;
}

export interface CreateTestAssignmentDto {
  sampleId: string;
  testDefinitionId?: string;
  sectionId: string;
  methodId: string;
  specificationId?: string;
  customTestName?: string;
  dueDate?: string;
  analystId?: string;
  status?: TestAssignmentStatus;
}

export interface UpdateTestAssignmentDto {
  customTestName?: string;
  dueDate?: string;
  analystId?: string;
  status?: TestAssignmentStatus;
  testDate?: string;
  result?: string;
  resultUnit?: string;
  oos?: boolean;
  comments?: string;
  invoiceNote?: string;
  precision?: string;
  linearity?: string;
  chkById?: string;
  chkDate?: string;
}

export interface EnterResultDto {
  result: string;
  resultUnit?: string;
  testDate?: string;
}

export interface BuildCOADto {
  sampleId: string;
  notes?: string;
  includeFields?: string[];
}

// ============================================================================
// UI/DISPLAY TYPES
// ============================================================================

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: PageInfo;
}
