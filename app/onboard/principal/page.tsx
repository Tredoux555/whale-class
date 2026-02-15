// app/onboard/principal/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3 | 4;

export default function PrincipalOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    schoolName: '', country: 'South Africa', timezone: 'Africa/Johannesburg',
    classroomName: '', ageGroup: '3-6',
    principalName: '', principalEmail: '', principalPassword: '', confirmPassword: ''
  });
  
  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }
  
  function validateStep(s: Step): boolean {
    if (s === 1 && !formData.schoolName.trim()) { setError('Enter school name'); return false; }
    if (s === 2 && !formData.classroomName.trim()) { setError('Enter classroom name'); return false; }
    if (s === 3) {
      if (!formData.principalName.trim()) { setError('Enter your name'); return false; }
      if (!formData.principalEmail.includes('@')) { setError('Enter valid email'); return false; }
      if (formData.principalPassword.length < 6) { setError('Password min 6 chars'); return false; }
      if (formData.principalPassword !== formData.confirmPassword) { setError('Passwords must match'); return false; }
    }
    return true;
  }
  
  async function handleSubmit() {
    if (!validateStep(3)) return;
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/onboard/principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌳</div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Montree</h1>
          <p className="text-gray-600 mt-2">Set up your school in 3 easy steps</p>
        </div>
        
        {step < 4 && (
          <div className="flex justify-center gap-2 mb-8">
            {[1,2,3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>{s}</div>
                {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800 text-sm">{error}</div>}
          
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Your school</h2>
              <input type="text" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)}
                placeholder="School name" className="w-full p-3 border rounded-lg mb-4" />
              <select value={formData.country} onChange={e => updateField('country', e.target.value)}
                className="w-full p-3 border rounded-lg">
                <option value="South Africa">South Africa</option>
                <option value="China">China</option>
                <option value="United States">United States</option>
              </select>
              <button onClick={() => validateStep(1) && setStep(2)} className="w-full mt-8 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700">Continue →</button>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">First classroom</h2>
              <input type="text" value={formData.classroomName} onChange={e => updateField('classroomName', e.target.value)}
                placeholder="Classroom name" className="w-full p-3 border rounded-lg mb-4" />
              <select value={formData.ageGroup} onChange={e => updateField('ageGroup', e.target.value)}
                className="w-full p-3 border rounded-lg">
                <option value="0-3">Infant (0-3)</option>
                <option value="3-6">Primary (3-6)</option>
                <option value="6-9">Elementary (6-9)</option>
              </select>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4 text-emerald-800 text-sm">
                ✨ Your classroom will receive the full curriculum (268 works) automatically!
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-3 border rounded-lg">← Back</button>
                <button onClick={() => validateStep(2) && setStep(3)} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700">Continue →</button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Your account</h2>
              <input type="text" value={formData.principalName} onChange={e => updateField('principalName', e.target.value)}
                placeholder="Your name" className="w-full p-3 border rounded-lg mb-4" />
              <input type="email" value={formData.principalEmail} onChange={e => updateField('principalEmail', e.target.value)}
                placeholder="Email" className="w-full p-3 border rounded-lg mb-4" />
              <input type="password" value={formData.principalPassword} onChange={e => updateField('principalPassword', e.target.value)}
                placeholder="Password (6+ chars)" className="w-full p-3 border rounded-lg mb-4" />
              <input type="password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)}
                placeholder="Confirm password" className="w-full p-3 border rounded-lg" />
              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(2)} className="px-6 py-3 border rounded-lg">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create School 🚀'}
                </button>
              </div>
            </div>
          )}
          
          {step === 4 && result && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Welcome aboard!</h2>
              <p className="text-gray-600 mb-6">{result.school.name} is ready</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ School: {result.school.name}</li>
                  <li>✅ Classroom: {result.classroom.name}</li>
                  <li>✅ Curriculum: {result.classroom.curriculumWorks} works</li>
                </ul>
              </div>
              <button onClick={() => router.push('/admin')} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700">
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


