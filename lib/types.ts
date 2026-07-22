export type Theme = 'study' | 'break' | 'exercise' | 'leisure' | 'special';

export interface TimeBlock {
  id: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  title: string;
  desc?: string;
  icon?: string;
  theme?: Theme;
  badge?: string;
  badgeClass?: string;
}

export interface SectionDivider {
  index: number;
  label: string;
}

export interface ScheduleData {
  slots: TimeBlock[];
  dividers: SectionDivider[];
}

export interface ToolOutput {
  tool: string;
  command: string;
  result: any;
}

export interface ChatRequest {
  prompt: string;
  schedule?: ScheduleData;
}

export interface ChatResponse {
  text: string;
  toolOutputs?: ToolOutput[];
  schedule?: ScheduleData;
}
