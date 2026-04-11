export type IntakeServiceType =
  | 'website'
  | 'automation'
  | 'intake_optimization'
  | 'other';

export type IntakeUrgency = 'low' | 'medium' | 'high';

export type IntakeWorkflowStatus =
  | 'received'
  | 'queued_for_automation'
  | 'automation_dispatched'
  | 'automation_failed';

export interface IntakeRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  message: string;
  serviceType: IntakeServiceType;
  urgency: IntakeUrgency;
  consent: boolean;
  source?: string;
}

export interface IntakeSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  message: string;
  serviceType: IntakeServiceType;
  urgency: IntakeUrgency;
  consent: boolean;
  source: string;
  workflowStatus: IntakeWorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntakeEvent {
  id: string;
  intakeId: string;
  type:
    | 'intake.received'
    | 'automation.dispatch.attempted'
    | 'automation.dispatch.succeeded'
    | 'automation.dispatch.failed';
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface IntakeResponse {
  success: boolean;
  intakeId: string;
  status: IntakeWorkflowStatus;
  message: string;
}
