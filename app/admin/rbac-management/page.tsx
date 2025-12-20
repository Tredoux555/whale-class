// =====================================================
// WHALE PLATFORM - ADMIN RBAC MANAGEMENT PANEL
// =====================================================
// Location: app/admin/rbac-management/page.tsx
// Purpose: Complete admin interface for managing roles and permissions
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import type { UserRole, FeatureKey, PermissionLevel } from '@/lib/permissions/roles';
import {
  ALL_PERMISSION_LEVELS,
  FEATURE_NAMES,
  ROLE_NAMES,
  getCategoryBadgeColor,
  getRoleBadgeColor,
} from '@/lib/permissions/roles';

interface FeaturePermission {
  feature_key: FeatureKey;
  feature_name: string;
  description: string | null;
  category: string;
  permissions: {
    view: boolean;
    edit: boolean;
    create: boolean;
    delete: boolean;
  };
}

interface Teacher {
  id: string;
  email: string;
  name: string | null;
  student_count: number;
  created_at: string;
}

export default function RBACManagementPage() {
  const [activeTab, setActiveTab] = useState<'permissions' | 'teachers' | 'audit'>('permissions');
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [features, setFeatures] = useState<FeaturePermission[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // New teacher form
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  const router = useRouter();
  
  // Create Supabase client only when needed (not during build/prerender)
  const getSupabase = () => {
    try {
      return createSupabaseClient();
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (activeTab === 'permissions') {
      loadPermissions();
    } else if (activeTab === 'teachers') {
      loadTeachers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, selectedRole]);

  async function checkAdminAccess() {
    // Check if admin is logged in via cookie (JWT)
    // Admin session is checked on the server side via API calls
    // If API calls return 403, we'll handle redirects there
    setLoading(false);
  }

  async function loadPermissions() {
    try {
      const response = await fetch(`/api/admin/rbac?role=${selectedRole}`);
      
      if (response.status === 403) {
        // Not authenticated as admin
        router.push('/admin/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load permissions');
      }

      const data = await response.json();
      setFeatures(data.permissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    }
  }

  async function fetchAuditLogs() {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadTeachers() {
    try {
      const response = await fetch('/api/admin/rbac/teachers');
      
      if (response.status === 403) {
        // Not authenticated as admin
        router.push('/admin/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load teachers');
      }

      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    }
  }

  async function togglePermission(
    featureKey: FeatureKey,
    permissionLevel: PermissionLevel,
    currentValue: boolean
  ) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/rbac', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_name: selectedRole,
          feature_key: featureKey,
          permission_level: permissionLevel,
          is_active: !currentValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update permission');
      }

      setSuccess(`Permission ${!currentValue ? 'granted' : 'revoked'} successfully`);
      
      // Reload permissions
      await loadPermissions();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  }

  async function addTeacher() {
    if (!newTeacherEmail) {
      setError('Email is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/rbac/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newTeacherEmail,
          name: newTeacherName || null,
          password: newTeacherPassword || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create teacher');
      }

      const data = await response.json();
      setSuccess(data.message || 'Teacher created successfully');
      
      // Reset form
      setNewTeacherEmail('');
      setNewTeacherName('');
      setNewTeacherPassword('');
      setShowAddTeacher(false);
      
      // Reload teachers
      await loadTeachers();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create teacher');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RBAC panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RBAC Management</h1>
              <p className="text-sm text-gray-600">Manage roles, permissions, and teacher accounts</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Permissions
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teachers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Teachers
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Audit Log
              </button>
            </nav>
          </div>
        </div>

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            {/* Role Selector */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role to Configure
              </label>
              <div className="flex gap-2">
                {(['admin', 'teacher', 'parent'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedRole === role
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {ROLE_NAMES[role]}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {ROLE_NAMES[selectedRole]} Permissions
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                        Feature
                      </th>
                      {ALL_PERMISSION_LEVELS.map((level) => (
                        <th key={level} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {level}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {features.map((feature) => (
                      <tr key={feature.feature_key} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{feature.feature_name}</div>
                            <div className="text-xs text-gray-500">{feature.description}</div>
                            <span className={`inline-flex mt-1 text-xs px-2 py-1 rounded ${getCategoryBadgeColor(feature.category as any)}`}>
                              {feature.category}
                            </span>
                          </div>
                        </td>
                        {ALL_PERMISSION_LEVELS.map((level) => (
                          <td key={level} className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={feature.permissions[level as keyof typeof feature.permissions]}
                              onChange={() =>
                                togglePermission(
                                  feature.feature_key,
                                  level,
                                  feature.permissions[level as keyof typeof feature.permissions]
                                )
                              }
                              disabled={saving}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div>
            {/* Add Teacher Button */}
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Teacher Accounts</h3>
              <button
                onClick={() => setShowAddTeacher(!showAddTeacher)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                + Add Teacher
              </button>
            </div>

            {/* Add Teacher Form */}
            {showAddTeacher && (
              <div className="mb-6 bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Create New Teacher Account</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={newTeacherEmail}
                      onChange={(e) => setNewTeacherEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="teacher@school.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (optional)
                    </label>
                    <input
                      type="password"
                      value={newTeacherPassword}
                      onChange={(e) => setNewTeacherPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty to send reset email"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={addTeacher}
                    disabled={saving || !newTeacherEmail}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Teacher'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTeacher(false);
                      setNewTeacherEmail('');
                      setNewTeacherName('');
                      setNewTeacherPassword('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Teachers List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {teachers.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{teacher.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{teacher.name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{teacher.student_count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(teacher.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button className="text-blue-600 hover:text-blue-900 font-medium mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900 font-medium">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No teachers found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📋 Audit Log</h2>
            
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No audit logs yet</p>
                <p className="text-sm">Permission changes will be logged here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {log.details}
                    </div>
                    <div className="text-xs text-gray-400">
                      By: {log.performed_by}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

