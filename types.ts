export interface Registration {
  id: string;
  studentName: string;
  lineId: string;
  classId: string; // References ClassSession.id
  className: string;
  classDate: string; // ISO String for sorting
  isPaid: boolean;
  paymentLast5?: string;
  timestamp: number;
}

export interface ClassSession {
  id: string;
  name: string;
  date: string; // ISO Date String
  timeDisplay: string; // e.g., "19:00 - 20:30"
  instructor: string;
}

export enum ViewMode {
  STUDENT_FORM = 'STUDENT_FORM',
  INSTRUCTOR_DASHBOARD = 'INSTRUCTOR_DASHBOARD'
}