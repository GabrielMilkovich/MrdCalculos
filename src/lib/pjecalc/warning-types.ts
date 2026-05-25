export type WarningSeverity = 'critical' | 'high' | 'medium' | 'info';

export type WarningCategory = 'engine' | 'config' | 'data' | 'parity';

export interface MotorWarning {
  code: string;
  severity: WarningSeverity;
  category: WarningCategory;
  message: string;
  user_message: string;
  action_hint?: string;
  module?: string;
}
