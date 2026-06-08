"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Mail, Layers, Eye, CheckCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const [profileDetails, setProfileDetails] = useState({
    name: "Candidate",
    email: "candidate@chirayupower.com",
    role: "Assigned Candidate Taker",
    department: "Recruitment & Talent Acquisition",
    username: "@candidate",
    passwordId: "CP-XXXXXX",
    status: "Active",
  });

  useEffect(() => {
    const email = localStorage.getItem("candidate_email") || "candidate@chirayupower.com";
    const name = localStorage.getItem("candidate_name") || "Candidate";
    const passwordId = localStorage.getItem("password_id") || "CP-XXXXXX";

    // Deduce standard usernames / display info
    const username = email ? `@${email.split("@")[0]}` : "@candidate";

    setProfileDetails({
      name,
      email,
      role: "Candidate Assessment Taker",
      department: "Human Resources / O&M Integration",
      username,
      passwordId,
      status: "Active",
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("candidate_email");
    localStorage.removeItem("password_id");
    localStorage.removeItem("candidate_name");
    toast.success("Successfully logged out from candidate portal.");
    router.push("/login");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-dark-100 animate-fadeIn">
      {/* Page Heading */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dark-100">User Profile</h1>
        <p className="text-sm text-soft-gray mt-1">
          Manage and review your candidate access credentials and assigned role context.
        </p>
      </div>

      {/* Main Profile Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card Summary Banner */}
        <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm md:col-span-1 flex flex-col items-center text-center justify-center space-y-4">
          <div className="size-24 rounded-full bg-primary-blue/5 border border-primary-blue/10 flex items-center justify-center">
            <User size={48} className="text-primary-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-100">{profileDetails.name}</h2>
            <p className="text-xs text-soft-gray font-semibold mt-1 uppercase tracking-wider">
              {profileDetails.role}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-success-green border border-success-green/20 text-xs font-bold uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-success-green animate-pulse" />
            {profileDetails.status}
          </div>
        </div>

        {/* Detailed Grid Parameters */}
        <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm md:col-span-2 space-y-6">
          <h3 className="text-base font-bold text-dark-100 pb-3 border-b border-border-gray flex items-center gap-2">
            <Shield size={18} className="text-primary-blue" />
            Identity Specifications
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Field: Full Name */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Full Name</span>
              <div className="text-sm font-semibold text-dark-100 flex items-center gap-2 mt-1">
                <User size={16} className="text-soft-gray" />
                {profileDetails.name}
              </div>
            </div>

            {/* Field: Corporate Role */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Designation</span>
              <div className="text-sm font-semibold text-dark-100 flex items-center gap-2 mt-1">
                <Layers size={16} className="text-soft-gray" />
                {profileDetails.role}
              </div>
            </div>

            {/* Field: Email Address */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Candidate Email</span>
              <div className="text-sm font-semibold text-dark-100 flex items-center gap-2 mt-1">
                <Mail size={16} className="text-soft-gray" />
                {profileDetails.email}
              </div>
            </div>

            {/* Field: Department */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Department</span>
              <div className="text-sm font-semibold text-dark-100 flex items-center gap-2 mt-1">
                <Layers size={16} className="text-soft-gray" />
                {profileDetails.department}
              </div>
            </div>

            {/* Field: Username */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Username</span>
              <div className="text-sm font-semibold text-dark-100 flex items-center gap-2 mt-1">
                <Eye size={16} className="text-soft-gray" />
                {profileDetails.username}
              </div>
            </div>

            {/* Field: Access Code */}
            <div className="space-y-1 pl-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block">Access Code</span>
              <div className="text-sm font-bold text-green-700 flex items-center gap-2 mt-1 font-mono uppercase">
                <Shield size={16} className="text-success-green" />
                {profileDetails.passwordId}
              </div>
            </div>
          </div>

          {/* Action Row - Log out */}
          <div className="pt-6 border-t border-border-gray flex justify-end">
            <Button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-600 font-bold px-5 py-2.5 h-10 rounded-xl text-xs uppercase tracking-wide gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              Disconnect Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
