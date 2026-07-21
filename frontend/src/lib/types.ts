export type UserRole = "admin" | "staff";

export interface AppUser {
  uuid: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at?: string;
}

export interface Customer {
  uuid: string;
  full_name: string;
  email: string | null;
  phone: string;
  identity_number: string;
  identity_number_masked: string;
  address: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_by?: string | null;
  meetings_count?: number;
  meetings?: Meeting[];
  created_at?: string;
  updated_at?: string;
}

export type MeetingStatus = "scheduled" | "waiting" | "active" | "completed" | "cancelled" | "expired";
export type MeetingResult = "pending" | "verified" | "not_verified" | "follow_up";
export type RecordingStatus = "none" | "recording" | "processing" | "ready" | "failed";

export interface MeetingEvent {
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface Meeting {
  uuid: string;
  meeting_code: string;
  title: string;
  description: string | null;
  customer: {
    uuid: string;
    full_name: string;
    phone: string;
  };
  staff: {
    uuid: string;
    name: string;
  };
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status: MeetingStatus;
  result: MeetingResult;
  staff_notes: string | null;
  recording_status: RecordingStatus;
  recording_download_url?: string;
  invitation_expires_at: string | null;
  invitation_url?: string;
  events?: MeetingEvent[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface DashboardStats {
  total_customers: number;
  total_meetings: number;
  meetings_today: number;
  upcoming_meetings: number;
  active_meetings: number;
  completed_meetings: number;
  cancelled_meetings: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcoming_meetings: Meeting[];
  recent_meetings: Meeting[];
}

export interface PublicMeetingSummary {
  title: string;
  description: string | null;
  scheduled_at: string;
  status: MeetingStatus;
  staff_name: string;
  customer_name_hint: string;
  invitation_expires_at: string;
  joinable: boolean;
}

export interface AgoraJoinInfo {
  app_id: string;
  channel: string;
  token: string;
  uid: number;
}
