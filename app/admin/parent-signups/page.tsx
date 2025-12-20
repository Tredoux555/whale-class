'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Mail, Phone, Calendar, User, Search } from 'lucide-react';

interface ParentSignup {
  id: string;
  child_first_name: string;
  child_last_name: string;
  child_date_of_birth: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  avatar_emoji: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  existing_child_id: string | null;
  link_code: string | null;
}

export default function ParentSignupsPage() {
  const [signups, setSignups] = useState<ParentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchSignups();
  }, [filter]);

  const fetchSignups = async () => {
    try {
      const response = await fetch(`/api/admin/parent-signups?status=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch signups');
      const data = await response.json();
      setSignups(data.signups || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (signupId: string) => {
    if (!confirm('Approve this signup and create/update the child account?')) return;

    setProcessingId(signupId);
    try {
      const response = await fetch('/api/admin/parent-signups/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve signup');
      }

      await fetchSignups();
      alert('Signup approved successfully! Child account created/updated.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (signupId: string) => {
    const notes = rejectionNotes[signupId] || '';
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Reject this signup? The parent will be notified.')) return;

    setProcessingId(signupId);
    try {
      const response = await fetch('/api/admin/parent-signups/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId, notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject signup');
      }

      await fetchSignups();
      setRejectionNotes({ ...rejectionNotes, [signupId]: '' });
      alert('Signup rejected successfully.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSignups = signups.filter((signup) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        signup.child_first_name.toLowerCase().includes(search) ||
        signup.child_last_name.toLowerCase().includes(search) ||
        signup.parent_name.toLowerCase().includes(search) ||
        signup.parent_email.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <Clock size={14} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading signups...</div>
      </div>
    );
  }

  return (
    <div 
      className="p-8"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2">
          📝 Parent Signups
        </h1>
        <p className="text-gray-600">
          Review and approve parent self-registration requests
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({signups.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Signups List */}
      <div className="space-y-4">
        {filteredSignups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              {filter === 'pending' ? 'No pending signups' : 'No signups found'}
            </p>
          </div>
        ) : (
          filteredSignups.map((signup) => (
            <div
              key={signup.id}
              className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 hover:border-indigo-300 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{signup.avatar_emoji}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {signup.child_first_name} {signup.child_last_name}
                    </h3>
                    <p className="text-gray-600 flex items-center gap-2 mt-1">
                      <Calendar size={16} />
                      DOB: {new Date(signup.child_date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {getStatusBadge(signup.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-700 mb-1 flex items-center gap-2">
                    <User size={16} />
                    Parent/Guardian
                  </p>
                  <p className="text-gray-800">{signup.parent_name}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
                    <Mail size={16} />
                    Email
                  </p>
                  <p className="text-gray-800">{signup.parent_email}</p>
                </div>

                {signup.parent_phone && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-blue-700 mb-1 flex items-center gap-2">
                      <Phone size={16} />
                      Phone
                    </p>
                    <p className="text-gray-800">{signup.parent_phone}</p>
                  </div>
                )}

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-purple-700 mb-1">
                    Submitted
                  </p>
                  <p className="text-gray-800">
                    {new Date(signup.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {signup.existing_child_id && (
                <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This signup will link to an existing child account using link code: <code className="bg-yellow-200 px-2 py-1 rounded">{signup.link_code}</code>
                  </p>
                </div>
              )}

              {signup.admin_notes && (
                <div className="bg-gray-50 border border-gray-300 p-3 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Admin Notes:</p>
                  <p className="text-gray-800">{signup.admin_notes}</p>
                </div>
              )}

              {signup.status === 'pending' && (
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <textarea
                      placeholder="Rejection reason (required if rejecting)..."
                      value={rejectionNotes[signup.id] || ''}
                      onChange={(e) =>
                        setRejectionNotes({
                          ...rejectionNotes,
                          [signup.id]: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(signup.id)}
                      disabled={processingId === signup.id}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition"
                    >
                      <CheckCircle size={20} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(signup.id)}
                      disabled={processingId === signup.id || !rejectionNotes[signup.id]?.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition"
                    >
                      <XCircle size={20} />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

