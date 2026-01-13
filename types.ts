
export enum TaskType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  EVENT = 'event'
}

export interface Task {
  id: string;
  label: string;
  isDone: boolean;
  type: TaskType;
}

export interface GameEvent {
  id: string;
  title: string;
  startDate?: string; // 新增：开始日期 YYYY-MM-DD
  deadline: string;   // 截止日期 YYYY-MM-DD
}

export interface Account {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Game {
  id: string;
  name: string;
  color: string;
  accounts: Account[];
  events: GameEvent[];
}

export interface AppData {
  games: Game[];
  lastUpdate: number;
}

/**
 * Added Role and Message types to fix import errors in ChatMessage.tsx
 */
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Message {
  role: Role;
  parts: MessagePart[];
  timestamp: number;
}
