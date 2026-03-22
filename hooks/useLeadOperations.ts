import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, Lead } from '@/components/montree/super-admin/types';

interface UseLeadOperationsProps {
  password: string;
  leads: Lead[];
  setLeads: (leads: Lead[] | ((prev: Lead[]) => Lead[])) => void;
  schools: School[];
  setSchools: (schools: School[] | ((prev: School[]) => School[])) => void;
  logAction: (action: string, details?: Record<string, unknown>) => Promise<void>;
  setNewLeadCount: (count: number | ((prev: number) => number)) => void;
  setDmUnreadTotal: (count: number | ((prev: number) => number)) => void;
  setDmUnreadPerConvo: (convo: Record<string, { count: number; sender_name: string }> | ((prev: Record<string, { count: number; sender_name: string }>) => Record<string, { count: number; sender_name: string }>)) => void;
}

export function useLeadOperations({
  password,
  leads,
  setLeads,
  schools,
  setSchools,
  logAction,
  setNewLeadCount,
  setDmUnreadTotal,
  setDmUnreadPerConvo
}: UseLeadOperationsProps) {
  const router = useRouter();

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: string) => {
    try {
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password
        },
        body: JSON.stringify({ lead_id: leadId, status: newStatus })
      });
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: newStatus } : l
      ));
      if (newStatus !== 'new') {
        setNewLeadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, [password, setLeads, setNewLeadCount]);

  const deleteLead = useCallback(async (lead: Lead) => {
    if (!confirm(`Delete ${lead.name || 'this lead'}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/montree/leads?lead_id=${lead.id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': password }
      });
      if (!res.ok) throw new Error('Failed');
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      if (lead.status === 'new') setNewLeadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Failed to delete lead');
    }
  }, [password, setLeads, setNewLeadCount]);

  const saveLeadNotes = useCallback(async (leadId: string, notesText: string) => {
    try {
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password
        },
        body: JSON.stringify({ lead_id: leadId, notes: notesText })
      });
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, notes: notesText } : l
      ));
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }, [password, setLeads]);

  const provisionSchool = useCallback(async (lead: Lead) => {
    const schoolName = lead.school_name || `${lead.name}'s School`;
    const email = lead.email || (lead.name ? `${lead.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}@montree.app` : `lead-${Date.now()}@montree.app`);

    if (!confirm(`Create trial school "${schoolName}" for ${lead.name}?\n\nThis will:\n• Create a new school\n• Create a principal account with email: ${email}\n• You'll get a password to share with them`)) {
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);

    try {
      const res = await fetch('/api/montree/principal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          principalName: lead.name || 'Principal',
          email,
          password: tempPassword
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Failed: ' + (data.error || 'Unknown error'));
        return;
      }

      const data = await res.json();
      const principalId = data.principal?.id;

      // Update lead status
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password
        },
        body: JSON.stringify({
          lead_id: lead.id,
          status: 'onboarded',
          provisioned_school_id: data.school?.id,
          notes: `${lead.notes ? lead.notes + '\n' : ''}Provisioned: ${new Date().toLocaleDateString()}\nEmail: ${email}\nTemp password: ${tempPassword}${principalId ? '\nPrincipal ID: ' + principalId : ''}`
        })
      });

      // Bridge DM conversation if we have principal ID
      if (principalId) {
        try {
          await fetch('/api/montree/dm', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': password
            },
            body: JSON.stringify({
              action: 'bridge',
              old_conversation_id: lead.id,
              new_conversation_id: principalId
            })
          });
        } catch (bridgeErr) {
          console.warn('Failed to bridge DM conversation:', bridgeErr);
        }
      }

      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, status: 'onboarded', provisioned_school_id: data.school?.id, notes: `${l.notes ? l.notes + '\n' : ''}Provisioned: ${new Date().toLocaleDateString()}\nEmail: ${email}\nTemp password: ${tempPassword}${principalId ? '\nPrincipal ID: ' + principalId : ''}` } : l
      ));
      setNewLeadCount(prev => Math.max(0, prev - 1));

      const bridgeNote = principalId ? '\n\n✓ DM conversation bridged to principal account' : '';
      alert(`✅ School created!\n\nSchool: ${schoolName}\nLogin email: ${email}\nPassword: ${tempPassword}\n\nShare these with ${lead.name} so they can log in at /montree/principal/login${bridgeNote}`);
    } catch (err) {
      console.error('Provision failed:', err);
      alert('Failed to provision school');
    }
  }, [password, setLeads, setNewLeadCount]);

  const updateSchoolStatus = useCallback(async (schoolId: string, newTier: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password,
        },
        body: JSON.stringify({
          schoolId,
          subscription_tier: newTier,
          subscription_status: newTier === 'free' ? 'active' : (newTier === 'paid' ? 'active' : 'trialing'),
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      setSchools(prev => prev.map(s =>
        s.id === schoolId
          ? { ...s, subscription_tier: newTier, subscription_status: newTier === 'free' ? 'active' : (newTier === 'paid' ? 'active' : 'trialing') }
          : s
      ));
      await logAction('update_school_status', { schoolId, newTier });
    } catch (err) {
      console.error('Failed to update school:', err);
      alert('Failed to update school status');
    }
  }, [password, setSchools, logAction]);

  const deleteSchool = useCallback(async (school: School) => {
    const confirmMsg = `🚨 DELETE "${school.name}"?\n\nThis will permanently delete:\n• ${school.classroom_count || 0} classrooms\n• ${school.teacher_count || 0} teachers\n• ${school.student_count || 0} students\n• All curriculum and progress data\n\nType "DELETE" to confirm:`;

    const input = prompt(confirmMsg);
    if (input !== 'DELETE') {
      alert('Cancelled - you must type DELETE to confirm');
      return;
    }

    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password,
        },
        body: JSON.stringify({ schoolIds: [school.id] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setSchools(prev => prev.filter(s => s.id !== school.id));
      alert(`✅ "${school.name}" deleted successfully`);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete school: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [password, setSchools]);

  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] = useState<{
    completed: number;
    total: number;
    results: Array<{ name: string; success: boolean }>;
  } | null>(null);

  const batchDeleteSchools = useCallback(async (schoolIds: string[]) => {
    if (schoolIds.length === 0) return;

    setBatchDeleting(true);
    setBatchDeleteProgress({ completed: 0, total: schoolIds.length, results: [] });

    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password,
        },
        body: JSON.stringify({ schoolIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Batch delete failed');
      }

      const data = await res.json();
      const results = (data.results || []) as Array<{ schoolId: string; name: string; success: boolean; error?: string }>;

      setBatchDeleteProgress({
        completed: results.length,
        total: schoolIds.length,
        results: results.map(r => ({ name: r.name, success: r.success })),
      });

      // Remove successfully deleted schools from state
      const deletedIds = new Set(results.filter(r => r.success).map(r => r.schoolId));
      setSchools(prev => prev.filter(s => !deletedIds.has(s.id)));

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        alert(`Deleted ${data.deleted}/${schoolIds.length}. ${failed.length} failed:\n${failed.map(f => `• ${f.name}: ${f.error || 'Unknown error'}`).join('\n')}`);
      } else {
        alert(`✅ Successfully deleted ${data.deleted} school${data.deleted !== 1 ? 's' : ''}`);
      }
    } catch (err) {
      console.error('Batch delete failed:', err);
      alert('Batch delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBatchDeleting(false);
    }
  }, [password, setSchools]);

  const clearBatchDeleteProgress = useCallback(() => {
    setBatchDeleteProgress(null);
  }, []);

  const loginAsSchool = useCallback(async (schoolId: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/login-as', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': password,
        },
        body: JSON.stringify({ schoolId }),
      });

      if (!res.ok) throw new Error('Failed to login');

      const data = await res.json();

      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      if (data.needsSetup) {
        router.push('/montree/principal/setup');
      } else {
        router.push('/montree/admin');
      }
    } catch (err) {
      console.error('Login as failed:', err);
      alert('Failed to login as principal');
    }
  }, [password, router]);

  return {
    updateLeadStatus,
    deleteLead,
    saveLeadNotes,
    provisionSchool,
    updateSchoolStatus,
    deleteSchool,
    batchDeleteSchools,
    batchDeleting,
    batchDeleteProgress,
    clearBatchDeleteProgress,
    loginAsSchool
  };
}
