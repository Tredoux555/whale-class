// app/admin/montessori/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Calendar, FileText, Loader } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age_group: string;
  photo_url: string | null;
}

export default function ReportsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchChildren();
    
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      router.push("/admin/login");
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/whale/children?active=true");
      if (response.ok) {
        const data = await response.json();
        setChildren(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedChild) {
      alert("Please select a child");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select a date range");
      return;
    }

    try {
      setGenerating(true);

      // First, get the report data
      const dataResponse = await fetch(
        `/api/whale/reports/generate?childId=${selectedChild}&startDate=${startDate}&endDate=${endDate}`
      );

      if (!dataResponse.ok) {
        throw new Error('Failed to generate report data');
      }

      const { data: reportData } = await dataResponse.json();

      // Then, generate the PDF
      const pdfResponse = await fetch('/api/whale/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData }),
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress_report_${reportData.child.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("Report downloaded successfully!");
    } catch (error: any) {
      console.error("Error generating report:", error);
      alert(`Failed to generate report: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📈</div>
              <div>
                <h1 className="text-2xl font-bold">Parent Reports</h1>
                <p className="text-sm opacity-90">Generate Progress Reports</p>
              </div>
            </div>
            <Link
              href="/admin/montessori"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back to Montessori
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">📊</div>
            <p className="text-[#2C5F7C] text-lg">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">About Parent Reports</h3>
                  <p className="text-blue-800 text-sm">
                    Generate comprehensive progress reports for parents showing their child's activities,
                    completion rates, and skill development across all curriculum areas.
                  </p>
                </div>
              </div>
            </div>

            {/* Report Generation Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-[#2C5F7C] mb-6">Generate Report</h2>

              <div className="space-y-6">
                {/* Select Child */}
                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Select Child *
                  </label>
                  <select
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2] text-lg"
                  >
                    <option value="">Choose a child...</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} (Age {child.age_group})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#2C5F7C] mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2C5F7C] mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                    />
                  </div>
                </div>

                {/* Quick Date Range Buttons */}
                <div>
                  <p className="text-sm font-semibold text-[#2C5F7C] mb-2">Quick Select:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 7);
                        setEndDate(end.toISOString().split('T')[0]);
                        setStartDate(start.toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 30);
                        setEndDate(end.toISOString().split('T')[0]);
                        setStartDate(start.toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 90);
                        setEndDate(end.toISOString().split('T')[0]);
                        setStartDate(start.toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Last 90 Days
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateReport}
                  disabled={generating || !selectedChild || !startDate || !endDate}
                  className="w-full bg-gradient-to-r from-[#4A90E2] to-[#2C5F7C] text-white px-8 py-4 rounded-xl text-lg font-bold hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                  {generating ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6" />
                      Generate PDF Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-[#2C5F7C] mb-4">What's Included in the Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Summary Statistics</h4>
                    <p className="text-sm text-gray-600">Total activities, completion rate, skills mastered</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📈</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Progress by Area</h4>
                    <p className="text-sm text-gray-600">Detailed breakdown for each curriculum area</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Recent Activities</h4>
                    <p className="text-sm text-gray-600">List of completed and assigned activities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Skill Mastery Levels</h4>
                    <p className="text-sm text-gray-600">Introduced, Practicing, Independent, Mastered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* No Children Notice */}
            {children.length === 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
                <p className="text-yellow-800 font-medium mb-4">
                  ⚠️ No children found
                </p>
                <p className="text-yellow-700 mb-4">
                  Please add children to your class before generating reports.
                </p>
                <Link
                  href="/admin/montessori/children"
                  className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-colors"
                >
                  Add Children
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
