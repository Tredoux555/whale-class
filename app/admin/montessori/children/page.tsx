// app/admin/montessori/children/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Child, AgeGroup } from "@/types/database";

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchChildren();
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
      const response = await fetch("/api/whale/children");
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      date_of_birth: formData.get("date_of_birth") as string,
      age_group: formData.get("age_group") as AgeGroup,
      enrollment_date: formData.get("enrollment_date") as string,
      parent_name: formData.get("parent_name") as string,
      parent_email: formData.get("parent_email") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const response = await fetch("/api/whale/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        e.currentTarget.reset();
        setShowAddForm(false);
        fetchChildren();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to add child"}`);
      }
    } catch (error) {
      console.error("Error adding child:", error);
      alert("Failed to add child");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">👶</div>
              <div>
                <h1 className="text-2xl font-bold">Manage Children</h1>
                <p className="text-sm opacity-90">Student Records</p>
              </div>
            </div>
            <Link
              href="/admin/montessori"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Add Child Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#4A90E2] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors shadow-md"
          >
            {showAddForm ? "Cancel" : "+ Add New Child"}
          </button>
        </div>

        {/* Add Child Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">Add New Child</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Date of Birth *
                  </label>
                  <input
                    name="date_of_birth"
                    type="date"
                    required
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Age Group *
                  </label>
                  <select
                    name="age_group"
                    required
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  >
                    <option value="2-3">2-3 years</option>
                    <option value="3-4">3-4 years</option>
                    <option value="4-5">4-5 years</option>
                    <option value="5-6">5-6 years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Enrollment Date
                  </label>
                  <input
                    name="enrollment_date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Parent Name
                  </label>
                  <input
                    name="parent_name"
                    type="text"
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                    Parent Email
                  </label>
                  <input
                    name="parent_email"
                    type="email"
                    className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#4A90E2] text-white py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Child"}
              </button>
            </form>
          </div>
        )}

        {/* Children List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">
            All Children ({children.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🐋</div>
              <p className="text-[#2C5F7C] text-lg">Loading...</p>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <p className="text-[#2C5F7C] text-lg font-semibold">No children yet!</p>
              <p className="text-[#2C5F7C]/70 mt-2">Click &quot;Add New Child&quot; to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/admin/montessori/children/${child.id}`}
                  className={`block rounded-xl p-4 hover:shadow-lg transition-all ${
                    child.active_status
                      ? "bg-gradient-to-br from-[#E8F4F8] to-[#B8E0F0]"
                      : "bg-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={child.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#4A90E2] flex items-center justify-center text-white text-2xl font-bold border-2 border-white">
                        {child.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-[#2C5F7C] text-lg">{child.name}</h3>
                      <p className="text-sm text-[#2C5F7C]/70">Age Group: {child.age_group}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {!child.active_status && (
                          <span className="text-xs text-red-600 font-semibold">Inactive</span>
                        )}
                        {child.login_password ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <span>🔐</span> Portal Access
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">No portal access</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[#2C5F7C]/70">
                    Enrolled: {new Date(child.enrollment_date).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
