// lib/montree/appointments/agora/types.ts
//
// Shared types for the Agora integration. Mirror parts of the migration 223
// schema + the Agora REST API contract.

export type RecordingStatus =
  | 'pending'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'failed';

export type AppointmentProvider = 'jitsi' | 'agora';

export type AgoraRole = 'publisher' | 'subscriber';

export interface AgoraConfig {
  appId: string;
  appCertificate: string;
  /** REST API basic-auth username (Customer ID). Required for Cloud Recording. */
  customerKey: string;
  /** REST API basic-auth password (Customer Secret). Required for Cloud Recording. */
  customerSecret: string;
  /** Supabase Storage bucket name where recordings are uploaded. */
  recordingBucket: string;
}

/**
 * Output of token-builder. Both the publish-side token (staff + parent) and
 * the recording-bot UID are derived from the same appId/cert.
 */
export interface AgoraJoinToken {
  appId: string;
  channel: string;
  /** Numeric UID assigned to this participant. Agora prefers 32-bit unsigned. */
  uid: number;
  token: string;
  /** Unix seconds when the token expires. Clients should rejoin before. */
  expiresAt: number;
}

/**
 * Persisted appointment-recording row shape (mirror of migration 223).
 */
export interface AppointmentRecording {
  id: string;
  appointment_id: string;
  school_id: string;
  recording_provider: 'agora';

  agora_channel_name: string | null;
  agora_resource_id: string | null;
  agora_sid: string | null;
  agora_uid: string | null;

  recording_storage_path: string | null;
  recording_duration_seconds: number | null;
  recording_file_size_bytes: number | null;

  transcript: string | null;
  transcript_locale: string | null;

  summary: string | null;
  summary_locale: string | null;

  recording_visible_to_parent: boolean;

  recording_status: RecordingStatus;
  failure_reason: string | null;

  started_at: string | null;
  ended_at: string | null;
  uploaded_at: string | null;
  transcribed_at: string | null;
  summarized_at: string | null;

  consent_acknowledged_at: string | null;

  created_at: string;
  updated_at: string;
}
