'use client';

import Link from 'next/link';
import { School } from './types';

interface SchoolsTabProps {
  schools: School[];
  loading: boolean;
  editingSchool: string | null;
  setEditingSchool: (id: string | null) => void;
  onUpdateStatus: (schoolId: string, tier: string) => void;
  onDeleteSchool: (school: School) => void;
  onLoginAs: (schoolId: string) => void;
  trialSchools: School[];
  freeSchools: School[];
  paidSchools: School[];
}

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    default: return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  }
};

export default function SchoolsTab({
  schools,
  loading,
  editingSchool,
  setEditingSchool,
  onUpdateStatus,
  onDeleteSchool,
  onLoginAs,
  trialSchools,
  freeSchools,
  paidSchools
}: SchoolsTabProps) {
  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Schools</p>
          <p className="text-2xl font-bold text-white">{schools.length}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm">Trial</p>
          <p className="text-2xl font-bold text-amber-400">{trialSchools.length}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-purple-400 text-sm">Free (NPO)</p>
          <p className="text-2xl font-bold text-purple-400">{freeSchools.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm">Paid</p>
          <p className="text-2xl font-bold text-emerald-400">{paidSchools.length}</p>
        </div>
      </div>

      {/* Schools Table */}
      {loading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
          </div>
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <h2 className="text-xl font-semibold text-white mb-2">No schools registered yet</h2>
          <p className="text-slate-400 mb-6">Be the first to register a school!</p>
          <Link
            href="/montree/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
          >
            Register First School
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">School</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Owner</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Stats</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-800/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {school.subscription_tier === 'free' ? '🌍' :
                         school.subscription_tier === 'paid' ? '⭐' : '🎓'}
                      </span>
                      <div>
                        <p className="font-medium text-white">{school.name}</p>
                        <p className="text-slate-500 text-sm">{school.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{school.owner_name || '-'}</p>
                    <p className="text-slate-400 text-sm">{school.owner_email}</p>
                  </td>
                  <td className="p-4">
                    {editingSchool === school.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onUpdateStatus(school.id, 'trial')}
                          className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                        >
                          Trial
                        </button>
                        <button
                          onClick={() => onUpdateStatus(school.id, 'free')}
                          className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        >
                          Free
                        </button>
                        <button
                          onClick={() => onUpdateStatus(school.id, 'paid')}
                          className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          Paid
                        </button>
                        <button
                          onClick={() => setEditingSchool(null)}
                          className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingSchool(school.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(school.subscription_tier || 'trial')} hover:opacity-80`}
                      >
                        {school.subscription_tier === 'free' ? '🌍 Free (NPO)' :
                         school.subscription_tier === 'paid' ? '⭐ Paid' :
                         '🎓 Trial'}
                        <span className="ml-1 opacity-50">✎</span>
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-slate-300">
                      {school.classroom_count || 0} classrooms • {school.student_count || 0} students
                    </div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(school.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onLoginAs(school.id)}
                        className="px-3 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        Login As →
                      </button>
                      <button
                        onClick={() => onDeleteSchool(school)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
