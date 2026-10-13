'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Users, Building2, Briefcase, UserPlus, Calendar,
  Clock, TrendingUp, ExternalLink, Copy, CheckCircle,
  ArrowUpRight, ChevronRight, Settings, BarChart3,
  DollarSign, Package, AlertTriangle, PartyPopper, FileText, GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

const stats = {
  totalEmployees: 142,
  totalBranches: 3,
  totalDepartments: 8,
  newEmployeesThisMonth: 6,
  jobPostsThisMonth: 4,
  candidatesThisMonth: 18,
  attendanceRate: 94,
  presentToday: 128,
  pendingLeaves: 5,
  onLeaveToday: 4,
  activeJobPostings: 7,
  totalCandidates: 42,
  totalPayrollThisMonth: 58400,
  payrollRunsThisMonth: 2,
  totalAssets: 96,
  assignedAssets: 88,
  pendingWarnings: 2,
  upcomingHolidays: 3,
  activeContracts: 131,
  expiringContracts: 6,
  activeTrainings: 9,
  completedTrainings: 24,
};

const attendanceWeekly = [
  { day: 'Mon', present: 120, absent: 5, leave: 4 },
  { day: 'Tue', present: 124, absent: 3, leave: 6 },
  { day: 'Wed', present: 118, absent: 7, leave: 5 },
  { day: 'Thu', present: 126, absent: 2, leave: 5 },
  { day: 'Fri', present: 122, absent: 4, leave: 7 },
  { day: 'Sat', present: 80, absent: 3, leave: 2 },
  { day: 'Sun', present: 0, absent: 0, leave: 0 },
];

const leaveOverview = [
  { name: 'Annual', value: 18, color: '#3b82f6' },
  { name: 'Sick', value: 9, color: '#ef4444' },
  { name: 'Personal', value: 7, color: '#f59e0b' },
  { name: 'Unpaid', value: 3, color: '#8b5cf6' },
];

const employeeGrowthData = [
  { month: 'Jan', employees: 110 },
  { month: 'Feb', employees: 114 },
  { month: 'Mar', employees: 118 },
  { month: 'Apr', employees: 121 },
  { month: 'May', employees: 125 },
  { month: 'Jun', employees: 129 },
  { month: 'Jul', employees: 133 },
  { month: 'Aug', employees: 136 },
  { month: 'Sep', employees: 139 },
  { month: 'Oct', employees: 141 },
  { month: 'Nov', employees: 142 },
  { month: 'Dec', employees: 145 },
];

const payrollTrendData = [
  { month: 'Jan', netPay: 52000 },
  { month: 'Feb', netPay: 53500 },
  { month: 'Mar', netPay: 54200 },
  { month: 'Apr', netPay: 55100 },
  { month: 'May', netPay: 56000 },
  { month: 'Jun', netPay: 56800 },
  { month: 'Jul', netPay: 57200 },
  { month: 'Aug', netPay: 57900 },
  { month: 'Sep', netPay: 58100 },
  { month: 'Oct', netPay: 58300 },
  { month: 'Nov', netPay: 58400 },
  { month: 'Dec', netPay: 59000 },
];

const todayBirthdays = [
  { id: 1, name: 'Sarah Johnson', designation: 'Senior Developer' },
  { id: 2, name: 'Michael Chen', designation: 'Product Manager' },
  { id: 3, name: 'Emily Rodriguez', designation: 'UX Designer' },
  { id: 4, name: 'James Wilson', designation: 'Marketing Lead' },
];

const todayOnLeave = [
  { id: 1, name: 'Alex Thompson', designation: 'Backend Developer', leaveType: 'Annual' },
  { id: 2, name: 'Maria Garcia', designation: 'HR Specialist', leaveType: 'Sick' },
  { id: 3, name: 'David Kim', designation: 'DevOps Engineer', leaveType: 'Personal' },
];

const formatCurrency = (val) => '$' + val.toLocaleString();

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fadeUp = (delay = 0, mounted) =>
  `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` +
  (delay ? ` delay-${delay}` : '');

// ── KPI Card Component ──
function KpiCard({ icon: Icon, title, value, subText, accent, href, delay, mounted, children }) {
  const accentMap = {
    teal: {
      border: 'border-teal-200 dark:border-teal-900/50',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      iconColor: 'text-teal-600 dark:text-teal-400',
      titleColor: 'text-teal-700 dark:text-teal-400',
      valueColor: 'text-teal-900 dark:text-teal-100',
      subColor: 'text-teal-600 dark:text-teal-500',
      arrowColor: 'text-teal-200 group-hover:text-teal-500',
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-900/50',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-400',
      valueColor: 'text-blue-900 dark:text-blue-100',
      subColor: 'text-emerald-600',
      arrowColor: 'text-blue-200 group-hover:text-blue-500',
    },
    emerald: {
      border: 'border-emerald-200 dark:border-emerald-900/50',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-400',
      valueColor: 'text-emerald-900 dark:text-emerald-100',
      subColor: 'text-emerald-600 dark:text-emerald-500',
      arrowColor: 'text-emerald-300 group-hover:text-emerald-600',
    },
    violet: {
      border: 'border-violet-200 dark:border-violet-900/50',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      iconColor: 'text-violet-600 dark:text-violet-400',
      titleColor: 'text-violet-700 dark:text-violet-400',
      valueColor: 'text-violet-900 dark:text-violet-100',
      subColor: 'text-violet-600 dark:text-violet-500',
      arrowColor: 'text-violet-200 group-hover:text-violet-500',
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-400',
      subColor: 'text-amber-500',
      arrowColor: 'text-amber-200 group-hover:text-amber-500',
    },
    orange: {
      border: 'border-orange-200 dark:border-orange-900/50',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      iconBg: 'bg-orange-100 dark:bg-orange-900/50',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-700 dark:text-orange-400',
      valueColor: 'text-orange-900 dark:text-orange-100',
      subColor: 'text-emerald-600',
      arrowColor: 'text-orange-200 group-hover:text-orange-500',
    },
  };

  const a = accentMap[accent] || accentMap.blue;

  const cardContent = (
    <Card
      className={cn(
        'h-full border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
        a.border,
        a.bg
      )}
    >
      <CardContent className="relative overflow-hidden p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('rounded-xl p-2.5', a.iconBg)}>
            <Icon className={cn('h-5 w-5', a.iconColor)} />
          </div>
          <ArrowUpRight
            className={cn(
              'h-4 w-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
              a.arrowColor
            )}
          />
        </div>
        <p className={cn('text-xs mb-1', a.titleColor)}>{title}</p>
        <p className={cn('text-2xl font-bold tracking-tight', a.valueColor)}>{value}</p>
        {subText && (
          <p className={cn('text-[11px] mt-1.5', a.subColor)}>{subText}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className={cn('group col-span-1', fadeUp(delay, mounted))}>
        {cardContent}
      </Link>
    );
  }

  return <div className={cn('group col-span-1', fadeUp(delay, mounted))}>{cardContent}</div>;
}

// ── Main Dashboard Component ──
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGrowthYear, setSelectedGrowthYear] = useState(2026);
  const [selectedPayrollYear, setSelectedPayrollYear] = useState(2026);
  const [now, setNow] = useState(new Date('2026-01-01T12:00:00'));

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFE] dark:bg-black min-h-full">
      <style>{`
        @keyframes waterWave {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }
        .animate-water-wave-1 { animation: waterWave 4s ease-in-out infinite; will-change: transform; }
        .animate-water-wave-2 { animation: waterWave 6s ease-in-out infinite reverse; will-change: transform; }
        .animate-water-wave-3 { animation: waterWave 8s ease-in-out infinite; will-change: transform; }
        @keyframes handWave {
          0%   { transform: rotate(0deg); }
          10%  { transform: rotate(18deg); }
          20%  { transform: rotate(-8deg); }
          30%  { transform: rotate(18deg); }
          40%  { transform: rotate(-4deg); }
          50%  { transform: rotate(12deg); }
          60%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-hand-wave { animation: handWave 2.2s ease-in-out infinite; transform-origin: 70% 70%; display: inline-block; }
      `}</style>

      {/* ── Greeting Banner ── */}
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl bg-slate-800 dark:bg-slate-900 p-4 sm:p-5 xl:p-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between',
          fadeUp(0, mounted)
        )}
      >
        <span className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
        <span className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.8s' }} />
        <span className="pointer-events-none absolute top-4 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)] animate-ping" style={{ animationDuration: '3s' }} />
        <span className="pointer-events-none absolute bottom-4 left-1/4 w-1 h-1 rounded-full bg-blue-400/70 shadow-[0_0_4px_2px_rgba(96,165,250,0.5)] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <span className="pointer-events-none absolute top-3 right-1/4 w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)] animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        <span className="pointer-events-none absolute bottom-3 right-1/3 w-1 h-1 rounded-full bg-emerald-300/80 shadow-[0_0_4px_2px_rgba(110,231,183,0.5)] animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.8s' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: '40px' }}>
          <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-1">
            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(52,211,153,0.12)" d="M0,20 C150,38 350,0 600,20 C850,38 1050,0 1200,20 C1350,38 1550,0 1800,20 C2050,38 2250,0 2400,20 L2400,40 L0,40 Z" /></svg>
          </div>
          <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-2">
            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(96,165,250,0.09)" d="M0,26 C200,10 400,38 600,22 C800,8 1000,36 1200,24 C1400,10 1600,38 1800,22 C2000,8 2200,36 2400,24 L2400,40 L0,40 Z" /></svg>
          </div>
          <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-3">
            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(167,139,250,0.07)" d="M0,30 C300,14 500,38 700,28 C900,16 1100,38 1200,28 C1400,14 1600,38 1900,28 C2100,16 2300,38 2400,28 L2400,40 L0,40 Z" /></svg>
          </div>
        </div>
        <div className="group-hover:translate-x-1 sm:group-hover:translate-x-2 transition-transform duration-300 min-w-0">
          <p className="text-slate-400 text-xs sm:text-sm mb-0.5 transition-colors duration-300">{getGreeting(now)},</p>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold group-hover:text-emerald-300 transition-colors duration-300">
              Company Admin
            </h2>
            <span className="animate-hand-wave text-xl sm:text-2xl md:text-3xl select-none shrink-0">👋</span>
          </div>
          <p className="text-slate-400 text-xs mt-1 transition-colors duration-300">
            Here&apos;s what&apos;s happening across your company today.
          </p>
          <div className="flex items-center gap-2.5 sm:gap-3 mt-2.5 sm:mt-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 bg-emerald-400/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
              <div className="w-2 h-2 bg-emerald-300/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
            </div>
            <span className="text-emerald-400 font-semibold text-xs sm:text-sm group-hover:scale-105 transition-transform duration-200">
              {stats.presentToday} present today
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 justify-between xl:justify-end w-full xl:w-auto pt-3 xl:pt-0 border-t border-slate-700/50 xl:border-t-0">
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <Link
            href="/recruitment/job-postings"
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-amber-400/10 group/qa"
          >
            <Briefcase className="h-5 w-5 text-amber-300 hover:text-amber-200 transition-all duration-200 group-hover/qa:-translate-y-0.5" />
            <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">Jobs</span>
          </Link>
          <Link
            href="/recruitment/candidates"
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-violet-400/10 group/qa"
          >
            <UserPlus className="h-5 w-5 text-violet-300 hover:text-violet-200 transition-all duration-200 group-hover/qa:-translate-y-0.5" />
            <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">Candidates</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-white/10 group/qa"
          >
            <Settings className="h-5 w-5 text-slate-300 hover:text-slate-200 transition-all duration-200 group-hover/qa:-translate-y-0.5" />
            <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">Settings</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={DollarSign}
          title="Payroll This Month"
          value={formatCurrency(stats.totalPayrollThisMonth)}
          subText={`${stats.payrollRunsThisMonth} runs completed`}
          accent="teal"
          href="/payroll/runs"
          delay={270}
          mounted={mounted}
        />
        <KpiCard
          icon={Users}
          title="Total Employees"
          value={stats.totalEmployees.toLocaleString()}
          subText={
            <span className="flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {stats.newEmployeesThisMonth} this month
            </span>
          }
          accent="blue"
          href="/hr/employees"
          delay={100}
          mounted={mounted}
        />
        <KpiCard
          icon={Building2}
          title="Branches"
          value={stats.totalBranches.toLocaleString()}
          subText={`${stats.totalDepartments} departments`}
          accent="emerald"
          href="/hr/branches"
          delay={130}
          mounted={mounted}
        />
        <KpiCard
          icon={Clock}
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          accent="violet"
          delay={160}
          mounted={mounted}
        >
          <div className="mt-2 h-1 w-full rounded-full bg-violet-100 dark:bg-violet-900/40">
            <div
              className="h-1 rounded-full bg-violet-500 transition-all duration-1000 ease-out"
              style={{ width: mounted ? `${Math.min(stats.attendanceRate, 100)}%` : '0%' }}
            />
          </div>
        </KpiCard>
        <KpiCard
          icon={Calendar}
          title="Pending Leaves"
          value={stats.pendingLeaves.toLocaleString()}
          subText={`${stats.onLeaveToday} on leave today`}
          accent="amber"
          href="/leave/applications"
          delay={190}
          mounted={mounted}
        />
        <KpiCard
          icon={Briefcase}
          title="Active Jobs"
          value={stats.activeJobPostings.toLocaleString()}
          subText={
            <span className="flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {stats.jobPostsThisMonth} this month
            </span>
          }
          accent="orange"
          href="/recruitment/job-postings"
          delay={220}
          mounted={mounted}
        />
      </div>

      {/* ── Today's Birthdays + Today's Leave ── */}
      <div className={cn('grid gap-4 lg:grid-cols-2', fadeUp(285, mounted))}>
        {/* Today's Birthdays */}
        <Card className="border border-pink-200 dark:border-pink-900/40 shadow-sm dark:bg-slate-900 overflow-hidden relative">
          <span className="pointer-events-none absolute top-3 left-8 w-1.5 h-1.5 rounded-sm rotate-45 bg-pink-400/60 animate-ping" style={{ animationDuration: '2.4s' }} />
          <span className="pointer-events-none absolute top-6 left-1/4 w-1 h-1 rounded-sm rotate-45 bg-fuchsia-400/50 animate-ping" style={{ animationDuration: '3.1s', animationDelay: '0.6s' }} />
          <span className="pointer-events-none absolute top-2 left-1/2 w-1.5 h-1.5 rounded-sm rotate-45 bg-pink-300/70 animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.2s' }} />
          <span className="pointer-events-none absolute top-5 right-1/3 w-1 h-1 rounded-sm rotate-45 bg-rose-400/60 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }} />
          <span className="pointer-events-none absolute top-3 right-12 w-1.5 h-1.5 rounded-sm rotate-45 bg-fuchsia-300/60 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.9s' }} />
          <span className="pointer-events-none absolute top-7 right-6 w-1 h-1 rounded-sm rotate-45 bg-pink-500/50 animate-ping" style={{ animationDuration: '4s', animationDelay: '1.5s' }} />
          <span className="pointer-events-none absolute top-1 left-3/4 w-2 h-2 rounded-sm rotate-45 bg-pink-200/80 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.4s' }} />
          <span className="pointer-events-none absolute top-4 left-16 w-1 h-1 rounded-sm rotate-45 bg-rose-300/70 animate-pulse" style={{ animationDuration: '2.6s', animationDelay: '1s' }} />
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Today&apos;s Birthdays</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Celebrate with your team</p>
              </div>
              <div className="rounded-xl bg-pink-100 dark:bg-pink-900/40 p-2">
                <PartyPopper className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-auto">
            {todayBirthdays.length > 0 ? (
              <div>
                {todayBirthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-semibold">
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="rounded-full bg-muted p-4 animate-pulse">
                  <PartyPopper className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No birthdays today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's On Leave */}
        <Card className="border border-amber-200 dark:border-amber-900/40 shadow-sm dark:bg-slate-900 overflow-hidden relative">
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Today&apos;s Leave</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Employees on leave today</p>
              </div>
              <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-auto">
            {todayOnLeave.length > 0 ? (
              <div>
                {todayOnLeave.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 shrink-0">
                      {emp.leaveType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="rounded-full bg-muted p-4 animate-pulse">
                  <Calendar className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No one on leave today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row: Attendance Weekly + Leave Overview ── */}
      <div className={cn('grid gap-4 lg:grid-cols-2', fadeUp(450, mounted))}>
        {/* Attendance Weekly */}
        <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div>
              <CardTitle className="text-base font-semibold">Attendance - Last 7 Days</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Daily present / absent / on leave</p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attendanceWeekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3b82f6" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: '#3b82f6', strokeOpacity: 0.3 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(255,255,255,0.7)', color: '#3b82f6' }}
                />
                <Bar dataKey="present" name="Present" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={32} />
                <Bar dataKey="leave" name="On Leave" stackId="a" fill="#F59E0B" maxBarSize={32} />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center">
              {[
                { color: '#10B981', label: 'Present' },
                { color: '#F59E0B', label: 'On Leave' },
                { color: '#EF4444', label: 'Absent' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leave Overview by Type */}
        <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Leave Overview</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Applications this month by status</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400">
                {leaveOverview.reduce((s, m) => s + m.value, 0)} total
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
              <div className="w-full sm:w-1/2 h-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leaveOverview} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                      {leaveOverview.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(255,255,255,0.7)', color: '#3b82f6' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:flex-1 space-y-3 min-w-0">
                {leaveOverview.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-muted-foreground break-words">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold">{s.value}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {leaveOverview.reduce((sum, l) => sum + l.value, 0) > 0
                          ? `${Math.round((s.value / leaveOverview.reduce((sum, l) => sum + l.value, 0)) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Charts Row: Employee Growth + Payroll Trend ── */}
      <div className={cn('grid gap-4 lg:grid-cols-2', fadeUp(500, mounted))}>
        {/* Employee Growth */}
        <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold">Employee Growth</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Total employees per month - {selectedGrowthYear}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {stats.totalEmployees} total
                </span>
                <select
                  value={selectedGrowthYear}
                  onChange={(e) => setSelectedGrowthYear(Number(e.target.value))}
                  className="h-7 w-24 text-xs rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {[2024, 2025, 2026].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-5">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={employeeGrowthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3b82f6" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: '#3b82f6', strokeOpacity: 0.3 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: '#3b82f6', strokeOpacity: 0.3 }} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(255,255,255,0.7)', color: '#3b82f6' }}
                  formatter={(v) => [v, 'Employees']}
                />
                <Area type="monotone" dataKey="employees" stroke="#3b82f6" strokeWidth={2} fill="url(#growthGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payroll Trend */}
        <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold">Payroll Trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly net pay - {selectedPayrollYear}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-900/20 dark:text-teal-400">
                  {formatCurrency(payrollTrendData.reduce((s, m) => s + m.netPay, 0))}
                </span>
                <select
                  value={selectedPayrollYear}
                  onChange={(e) => setSelectedPayrollYear(Number(e.target.value))}
                  className="h-7 w-24 text-xs rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {[2024, 2025, 2026].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={payrollTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3b82f6" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: '#3b82f6', strokeOpacity: 0.3 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(255,255,255,0.7)', color: '#3b82f6' }}
                  formatter={(v) => [`$${v.toLocaleString()}`, 'Net Pay']}
                />
                <Bar dataKey="netPay" name="Net Pay" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
