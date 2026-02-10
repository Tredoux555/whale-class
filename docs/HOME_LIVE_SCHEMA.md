# Home System — LIVE Database Schema (Feb 9 2026)
# Source: SELECT from information_schema.columns WHERE table_name LIKE 'home_%'
# This is the TRUTH. Never code against migration files — code against THIS.

## Tables (8 total)

### home_families
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| email | text | NO | |
| name | text | NO | |
| auth_user_id | uuid | YES | |
| timezone | text | YES | 'America/Chicago' |
| settings | jsonb | YES | {preferences: {activities_per_day: 3}, notifications: {...}} |
| onboarding_completed | boolean | YES | false |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| materials_owned | jsonb | YES | [] |
| weekly_plans | jsonb | YES | {} |
| join_code | text | YES | |
| password_hash | text | YES | |
| plan | text | NO | 'free' |
| trial_ends_at | timestamptz | YES | now() + 14 days |

### home_children
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| family_id | uuid | NO | |
| name | text | NO | |
| birth_date | date | NO | |
| photo_url | text | YES | |
| start_date | date | YES | CURRENT_DATE |
| color | text | YES | '#4F46E5' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| journal_entries | jsonb | YES | [] |
| age | integer | YES | |
| enrolled_at | date | YES | CURRENT_DATE |

### home_curriculum
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| family_id | uuid | NO | |
| area | text | NO | |
| area_sequence | integer | NO | 0 |
| category | text | NO | |
| category_sequence | integer | NO | 0 |
| name | text | YES | |
| description | text | YES | |
| age_range | text | YES | |
| sequence | integer | NO | 0 |
| video_url | text | YES | |
| video_thumbnail | text | YES | |
| materials | jsonb | YES | [] |
| direct_aim | text | YES | |
| indirect_aim | text | YES | |
| presentation_steps | jsonb | YES | [] |
| observation_prompts | jsonb | YES | [] |
| is_active | boolean | YES | true |
| materials_owned | boolean | YES | false |
| notes | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| work_name | text | YES | |

### home_curriculum_master
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| area | text | NO | |
| area_sequence | integer | NO | 0 |
| category | text | NO | |
| category_sequence | integer | NO | 0 |
| name | text | NO | |
| description | text | YES | |
| age_range | text | YES | |
| sequence | integer | NO | 0 |
| video_url | text | YES | |
| video_thumbnail | text | YES | |
| materials | jsonb | YES | [] |
| direct_aim | text | YES | |
| indirect_aim | text | YES | |
| presentation_steps | jsonb | YES | [] |
| observation_prompts | jsonb | YES | [] |
| is_active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### home_child_progress
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| child_id | uuid | NO | |
| curriculum_work_id | uuid | NO | |
| status | integer | NO | 0 |
| presented_date | date | YES | |
| practicing_date | date | YES | |
| mastered_date | date | YES | |
| times_practiced | integer | YES | 0 |
| last_practiced | date | YES | |
| notes | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### home_activity_log
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| family_id | uuid | NO | |
| child_id | uuid | YES | |
| activity_type | text | NO | |
| activity_data | jsonb | YES | {} |
| created_at | timestamptz | YES | now() |

### home_master_curriculum (created by migration 130 — DUPLICATE of home_curriculum_master)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | NO | |
| work_name | text | NO | |
| area_key | text | NO | |
| area_name | text | NO | |
| area_icon | text | YES | |
| area_color | text | YES | |
| description | text | YES | |
| age_range | text | YES | '3-6' |
| sequence | integer | YES | |
| home_sequence | integer | NO | |
| home_priority | text | NO | 'recommended' |
| home_tip | text | YES | |
| buy_or_make | text | YES | |
| (possibly more — schema dump was truncated) | | | |
