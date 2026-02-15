# app/api/auth/users/route.ts - Implementation Details for Opus

## File Location
`app/api/auth/users/route.ts`

## Action Taken
Entire file replaced with new implementation that fixes build-time Supabase client initialization issue.

## Technical Implementation

### Supabase Client Initialization Pattern
- **CRITICAL**: Supabase client is created INSIDE handler functions, not at module level
- Uses helper function `getSupabase()` that is called within each request handler
- This prevents build-time errors when environment variables aren't available during Next.js build phase

### Code Structure

```typescript
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Why this pattern:**
- Environment variables are only available at runtime, not during build
- Next.js tries to evaluate module-level code during build, causing errors if env vars aren't set
- By moving client creation inside handlers, it only runs when requests are made (runtime)

### GET Handler - List Users
- **Route**: `GET /api/auth/users`
- **Authentication**: Requires valid session via `getUserSession()`
- **Authorization**: Only `super_admin` and `school_admin` roles allowed
- **Role-based filtering**:
  - `super_admin`: Sees all users across all schools
  - `school_admin`: Only sees users from their own school (filtered by `session.schoolId`)
- **Query**: Selects `id, email, name, role, school_id, is_active, last_login, created_at`
- **Ordering**: Descending by `created_at` (newest first)

### POST Handler - Create User
- **Route**: `POST /api/auth/users`
- **Authentication**: Requires valid session
- **Authorization**: Requires `canManageUsers` permission (checked via `hasPermission()`)
- **Role restrictions**:
  - `school_admin` can only create `teacher` and `parent` roles
  - `school_admin` users are automatically assigned to admin's school (cannot set different `school_id`)
- **Validation**:
  - Required fields: `email`, `password`, `name`, `role`
  - Email uniqueness check before creation
  - Email normalized (lowercase, trimmed)
- **Password handling**: Uses `hashPassword()` from `@/lib/auth-multi`
- **Database insert**: Creates user with `is_active: true` by default

## Dependencies

### Imported Functions (from `@/lib/auth-multi`)
1. `getUserSession()` - Returns session object with:
   - `role`: User's role (e.g., 'super_admin', 'school_admin', 'teacher', 'parent')
   - `schoolId`: School ID for school_admin users
2. `hashPassword(password: string)` - Returns hashed password string
3. `hasPermission(role: string, permission: string)` - Returns boolean for permission check

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

### Database Schema (users table)
Expected columns:
- `id` - Primary key
- `email` - Unique, indexed
- `password_hash` - Hashed password
- `name` - User's full name
- `role` - User role (super_admin, school_admin, teacher, parent, etc.)
- `school_id` - Foreign key to schools table (nullable)
- `is_active` - Boolean flag
- `last_login` - Timestamp (nullable)
- `created_at` - Timestamp

## Error Handling

### GET Handler Errors
- `401 Unauthorized` - No valid session
- `403 Forbidden` - User doesn't have required role
- `500 Internal Server Error` - Database query failed

### POST Handler Errors
- `401 Unauthorized` - No valid session
- `403 Forbidden` - No permission or role restriction violation
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Database operation failed

## Security Considerations

1. **Service Role Key**: Uses service role key (bypasses RLS) - appropriate for admin operations
2. **Password Hashing**: Passwords are hashed before storage
3. **Email Normalization**: Emails are lowercased and trimmed to prevent duplicates
4. **Role-based Access Control**: Multiple layers of authorization checks
5. **School Scoping**: School admins are restricted to their own school's data

## Request/Response Examples

### GET Request
```http
GET /api/auth/users
Authorization: Bearer <session-token>
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "teacher",
      "school_id": "school-uuid",
      "is_active": true,
      "last_login": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST Request
```http
POST /api/auth/users
Content-Type: application/json
Authorization: Bearer <session-token>

{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "name": "Jane Smith",
  "role": "teacher",
  "schoolId": "school-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "role": "teacher",
    "school_id": "school-uuid",
    "is_active": true,
    "created_at": "2025-01-15T12:00:00Z"
  }
}
```

## Build-Time Safety

The implementation ensures:
- No module-level Supabase client initialization
- All environment variable access happens at runtime
- Compatible with Next.js build process
- No build-time errors related to missing environment variables

## Related Files to Check
- `lib/auth-multi.ts` - Must export the three functions used
- `lib/supabase.ts` - Alternative Supabase client creation (not used in this file)
- Database migrations - Ensure `users` table schema matches expected structure





