'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Users, ShieldCheck, Link as LinkIcon, Briefcase, Calendar, UserCheck, FileText, Award, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY_COLOR = '#3b82f6';

function hexToAdjustedRgba(hex, opacity = 1, adjust = 0) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const getF = (ch) => (typeof adjust === 'number' ? clamp(adjust) : clamp(adjust[ch] ?? 0));
    const adj = (c, f) => (f < 0 ? Math.floor(c * (1 + f)) : Math.floor(c + (255 - c) * f));
    const rr = adj(r, getF('r'));
    const gg = adj(g, getF('g'));
    const bb = adj(b, getF('b'));
    return opacity === 1
        ? `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`.toUpperCase()
        : `rgba(${rr}, ${gg}, ${bb}, ${opacity})`;
}

export function AuthLayout({ children, title, description, icon, status, statusType = 'success' }) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isRTL, setIsRTL] = useState(false);

    const isLoginPage = pathname.includes('login') || pathname === '/' || pathname === '';
    const isRegisterPage = pathname.includes('register');
    const isForgotPasswordPage = pathname.includes('forgot-password') || pathname.includes('password/reset');
    const isResetPasswordPage = pathname.includes('reset-password');
    const isCenteredHeader = isForgotPasswordPage || isResetPasswordPage;

    useEffect(() => {
        setMounted(true);

        // Check dark mode
        const checkDark = () => {
            const isDarkMode = document.documentElement.classList.contains('dark') ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(isDarkMode);
        };
        checkDark();

        const darkObserver = new MutationObserver(checkDark);
        darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        // Check RTL
        const checkRTL = () => {
            const dir = document.documentElement.getAttribute('dir');
            setIsRTL(dir === 'rtl');
        };
        checkRTL();

        const rtlObserver = new MutationObserver(checkRTL);
        rtlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

        return () => {
            darkObserver.disconnect();
            rtlObserver.disconnect();
        };
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className={cn(
            'min-h-screen md:h-screen overflow-hidden flex flex-col md:flex-row w-full bg-white dark:bg-gray-900 ltr:text-left rtl:text-right font-sans',
            isRTL && 'rtl'
        )}>
            {/* Left Side (Form) */}
            <div className="w-full md:w-[50%] xl:w-[45%] flex flex-col justify-between min-h-screen md:min-h-0 md:h-full p-4 sm:p-6 lg:p-8 xl:p-8 relative overflow-y-auto">
                {/* Language Switcher for Mobile */}
                <div className="absolute top-6 end-6 z-20 bg-white dark:bg-gray-800 rounded-md shadow-sm md:hidden">
                    <LanguageSwitcher />
                </div>

                {/* Header - Logo */}
                <div className="flex justify-center">
                    <div className="inline-block">
                        <div className="flex items-center justify-center space-x-2">
                            <CreditCard className="h-9 w-9 sm:h-11 sm:w-11" style={{ color: PRIMARY_COLOR }} />
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">HRM</span>
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="flex-1 flex flex-col justify-center w-full max-w-lg mx-auto py-2 xl:py-4 ltr:text-left rtl:text-right">
                    <div className={cn(
                        'flex flex-col',
                        isCenteredHeader ? 'items-center text-center' : 'items-start ltr:text-left rtl:text-right'
                    )}>
                        {icon && (
                            <div
                                className={cn(
                                    'mb-3 flex items-center justify-center rounded-full',
                                    isCenteredHeader ? 'h-14 w-14' : 'h-11 w-11'
                                )}
                                style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                            >
                                {icon}
                            </div>
                        )}
                        <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
                        <div className={cn('w-8 h-1 mb-3', isCenteredHeader && 'mx-auto')} style={{ backgroundColor: PRIMARY_COLOR }}></div>
                        {description && (
                            <p className="text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 truncate line-clamp-2">{description}</p>
                        )}
                    </div>

                    {status && (
                        <div className={cn(
                            'mb-5 text-sm font-medium p-3 rounded-lg border',
                            statusType === 'success'
                                ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/40'
                                : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/40'
                        )}>
                            {status}
                        </div>
                    )}

                    {children}
                </div>

                {/* Footer - Copyright Info */}
                <div className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm text-center">
                    &copy; {new Date().getFullYear()} HRM SaaS. All rights reserved.
                </div>
            </div>

            {/* Right Side (Graphics/Promotional for HRM) */}
            <div className="hidden md:flex w-full md:w-[50%] xl:w-[55%] bg-slate-50 dark:bg-gray-950 items-center justify-center p-4 lg:p-8 xl:p-12 relative overflow-hidden">
                {/* Language Switcher for Desktop */}
                <div className="absolute top-6 end-6 lg:top-12 lg:end-12 z-20 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                    <LanguageSwitcher />
                </div>

                {/* Promotional Content */}
                <div className="w-full max-w-[800px] z-10 py-2 xl:py-4">
                    {isLoginPage && <LoginPromo />}
                    {isRegisterPage && <RegisterPromo />}
                    {isForgotPasswordPage && <ForgotPasswordPromo />}
                    {isResetPasswordPage && <ResetPasswordPromo />}
                </div>

                {/* Decorative Background Elements */}
                <div
                    className="absolute top-0 ltr:right-0 rtl:left-0 ltr:-mt-20 rtl:-mt-20 ltr:-mr-20 rtl:-ml-20 w-[600px] h-[600px] rounded-full mix-blend-multiply opacity-10 blur-3xl pointer-events-none"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                ></div>

                <div className="absolute top-12 ltr:right-24 rtl:left-24 opacity-20 pointer-events-none">
                    <svg width="80" height="80" fill="none" viewBox="0 0 80 80">
                        <pattern id="dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="2" fill="currentColor" style={{ color: PRIMARY_COLOR }} />
                        </pattern>
                        <rect x="0" y="0" width="80" height="80" fill="url(#dots)" />
                    </svg>
                </div>

                <div
                    className="absolute bottom-0 ltr:left-0 rtl:right-0 ltr:-mb-20 rtl:-mb-20 ltr:-ml-20 rtl:-mr-20 w-[400px] h-[400px] rounded-full mix-blend-multiply opacity-[0.05] blur-3xl pointer-events-none"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                ></div>
                <div
                    className="absolute bottom-0 ltr:right-0 rtl:left-0 ltr:-mb-20 rtl:-mb-20 ltr:-mr-20 rtl:-ml-20 w-[400px] h-[400px] rounded-full mix-blend-multiply opacity-[0.05] blur-3xl pointer-events-none"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                ></div>

                <div className="absolute bottom-12 ltr:left-24 rtl:right-24 opacity-20 pointer-events-none">
                    <svg width="48" height="48" fill="none" viewBox="0 0 48 48">
                        <pattern id="dots-bl" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="2" fill="currentColor" style={{ color: PRIMARY_COLOR }} />
                        </pattern>
                        <rect x="0" y="0" width="48" height="48" fill="url(#dots-bl)" />
                    </svg>
                </div>

                <div className="absolute bottom-12 ltr:right-24 rtl:left-24 opacity-20 pointer-events-none">
                    <svg width="48" height="48" fill="none" viewBox="0 0 48 48">
                        <pattern id="dots-br" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="2" fill="currentColor" style={{ color: PRIMARY_COLOR }} />
                        </pattern>
                        <rect x="0" y="0" width="48" height="48" fill="url(#dots-br)" />
                    </svg>
                </div>
            </div>

            <CookieConsentBanner />
        </div>
    );
}

function LanguageSwitcher() {
    const [lang, setLang] = useState('en');

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'ar' : 'en';
        setLang(newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
        document.body.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    return (
        <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            {lang === 'en' ? 'EN' : 'AR'}
        </button>
    );
}

function CookieConsentBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                    We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={accept}
                        className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                        Accept
                    </button>
                    <button
                        onClick={accept}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoginPromo() {
    return (
        <>
            <h2 className="text-xl lg:text-2xl xl:text-[40px] font-bold text-[#1E293B] dark:text-white mb-1.5 lg:mb-3 xl:mb-5 leading-tight">
                Manage Your Workforce<br />
                Smarter with <span style={{ color: PRIMARY_COLOR }}>HRM SaaS</span>
            </h2>
            <p className="text-[#475569] dark:text-gray-300 text-xs lg:text-sm xl:text-lg mb-3 lg:mb-5 xl:mb-8 max-w-lg leading-normal xl:leading-relaxed">
                Streamline employee management, attendance tracking, payroll, performance, and daily operations – all in one powerful platform.
            </p>

            {/* Cards wrapper */}
            <div className="space-y-2 lg:space-y-3 xl:space-y-4 max-w-[100%] lg:max-w-[95%] mx-auto">
                {/* Main HR Overview Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100/50 dark:border-gray-700 p-2.5 sm:p-3 lg:p-4 xl:p-6">
                    <div className="flex items-center mb-2 lg:mb-3 xl:mb-4">
                        <div
                            className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 rounded-lg dark:bg-gray-800 flex items-center justify-center ltr:mr-2 rtl:ml-2 xl:ltr:mr-2.5 xl:rtl:ml-2.5"
                            style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                        >
                            <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" style={{ color: PRIMARY_COLOR }} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-xs lg:text-sm xl:text-lg">HR Workflow Overview</h3>
                    </div>

                    {/* Workflow Steps Row */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 items-center justify-between gap-1.5 lg:gap-2 xl:gap-3 mb-2 lg:mb-3 xl:mb-5">
                        {/* Step 1 */}
                        <div className="min-w-0 flex flex-col justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-1.5 lg:p-2 xl:p-3 shadow-sm bg-white dark:bg-gray-800 min-h-[60px] lg:min-h-[75px] xl:min-h-[90px] h-auto">
                            <div className="flex items-center mb-0.5 xl:mb-1">
                                <UserCheck className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4.5 xl:h-4.5" style={{ color: PRIMARY_COLOR }} />
                                <span className="text-[10px] lg:text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white ltr:ml-1 rtl:mr-1 truncate line-clamp-1">Onboarding</span>
                            </div>
                            <div>
                                <div className="text-sm lg:text-lg xl:text-xl font-bold mb-0.5 xl:mb-1" style={{ color: PRIMARY_COLOR }}>34</div>
                                <div className="h-1 xl:h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full w-full rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="min-w-0 flex flex-col justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-1.5 lg:p-2 xl:p-3 shadow-sm bg-white dark:bg-gray-800 min-h-[60px] lg:min-h-[75px] xl:min-h-[90px] h-auto">
                            <div className="flex items-center mb-0.5 xl:mb-1">
                                <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4.5 xl:h-4.5" style={{ color: PRIMARY_COLOR }} />
                                <span className="text-[10px] lg:text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white ltr:ml-1 rtl:mr-1 truncate line-clamp-1">Attendance</span>
                            </div>
                            <div>
                                <div className="text-sm lg:text-lg xl:text-xl font-bold mb-0.5 xl:mb-1" style={{ color: PRIMARY_COLOR }}>96%</div>
                                <div className="h-1 xl:h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full w-11/12 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="min-w-0 flex flex-col justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-1.5 lg:p-2 xl:p-3 shadow-sm bg-white dark:bg-gray-800 min-h-[60px] lg:min-h-[75px] xl:min-h-[90px] h-auto">
                            <div className="flex items-center mb-0.5 xl:mb-1">
                                <Calendar className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4.5 xl:h-4.5 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                                <span className="text-[10px] lg:text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white ltr:ml-1 rtl:mr-1 truncate line-clamp-1">Leaves</span>
                            </div>
                            <div>
                                <div className="text-sm lg:text-lg xl:text-xl font-bold mb-0.5 xl:mb-1" style={{ color: PRIMARY_COLOR }}>12</div>
                                <div className="h-1 xl:h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="min-w-0 flex flex-col justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-1.5 lg:p-2 xl:p-3 shadow-sm bg-white dark:bg-gray-800 min-h-[60px] lg:min-h-[75px] xl:min-h-[90px] h-auto">
                            <div className="flex items-center mb-0.5 xl:mb-1">
                                <Award className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4.5 xl:h-4.5" style={{ color: PRIMARY_COLOR }} />
                                <span className="text-[10px] lg:text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white ltr:ml-1 rtl:mr-1 truncate line-clamp-1">Payroll Done</span>
                            </div>
                            <div>
                                <div className="text-sm lg:text-lg xl:text-xl font-bold mb-0.5 xl:mb-1" style={{ color: PRIMARY_COLOR }}>100%</div>
                                <div className="h-1 xl:h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full w-full rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lower Stats Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 lg:gap-3 xl:gap-4 mt-2 lg:mt-3 xl:mt-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg xl:rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] xl:shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-gray-700 p-2 lg:p-3 xl:p-4 flex items-center">
                            <div
                                className="w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full dark:bg-gray-900 flex items-center justify-center ltr:mr-2.5 rtl:ml-2.5 xl:ltr:mr-4 xl:rtl:ml-4 flex-shrink-0"
                                style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                            >
                                <Users className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6" style={{ color: PRIMARY_COLOR }} />
                            </div>
                            <div>
                                <div className="text-[11px] lg:text-xs xl:text-[13px] font-bold text-gray-900 dark:text-white mb-0.5">Active Employees</div>
                                <div className="text-base lg:text-xl xl:text-3xl font-bold text-gray-400">142 <span className="text-[10px] xl:text-xs font-normal">members</span></div>
                                <div className="text-[10px] lg:text-[11px] xl:text-[12px] font-semibold mt-0.5" style={{ color: PRIMARY_COLOR }}>
                                    &uarr; 8.5% <span className="text-gray-400 font-normal">this quarter</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg xl:rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] xl:shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-gray-700 p-2 lg:p-3 xl:p-4 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] lg:text-xs xl:text-[13px] font-bold text-gray-900 dark:text-white mb-0.5">Payroll Processed</div>
                                <div className="text-base lg:text-xl xl:text-3xl font-bold" style={{ color: PRIMARY_COLOR }}>$58,400</div>
                                <div className="text-[10px] lg:text-[11px] xl:text-[12px] font-semibold mt-0.5 flex items-center" style={{ color: PRIMARY_COLOR }}>
                                    <svg className="w-2.5 h-2.5 xl:w-3 xl:h-3 ltr:mr-0.5 rtl:ml-0.5 xl:ltr:mr-1 xl:rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                                    </svg>
                                    100% <span className="text-gray-400 ltr:ml-1 rtl:mr-1 font-normal">on time</span>
                                </div>
                            </div>
                            <div className="h-8 w-16 lg:h-10 lg:w-20 xl:h-12 xl:w-24">
                                <svg viewBox="0 0 100 40" className="w-full h-full fill-none overflow-visible" style={{ stroke: PRIMARY_COLOR }} strokeWidth="2.5" preserveAspectRatio="none">
                                    <path d="M0,35 L10,32 L20,38 L30,25 L40,28 L50,15 L60,20 L70,10 L80,12 L90,2 L100,0" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="100" cy="0" r="3" style={{ fill: PRIMARY_COLOR, stroke: 'none' }} />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Icons Row */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-3 xl:gap-4 mt-2 xl:mt-4 pt-1 xl:pt-2">
                    <div className="text-center">
                        <div className="w-8 h-8 lg:w-9 lg:h-9 xl:w-12 xl:h-12 mx-auto rounded-full flex items-center justify-center mb-1 xl:mb-3" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                            <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" style={{ color: PRIMARY_COLOR }} />
                        </div>
                        <div className="text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white mb-0.5 xl:mb-1">Employee Database</div>
                        <div className="text-[10px] xl:text-[11px] text-gray-500 dark:text-gray-400 leading-tight xl:leading-relaxed px-1">Manage records, documents, and profiles securely.</div>
                    </div>
                    <div className="text-center">
                        <div className="w-8 h-8 lg:w-9 lg:h-9 xl:w-12 xl:h-12 mx-auto rounded-full flex items-center justify-center mb-1 xl:mb-3" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                            <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" style={{ color: PRIMARY_COLOR }} />
                        </div>
                        <div className="text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white mb-0.5 xl:mb-1">Attendance &amp; Leaves</div>
                        <div className="text-[10px] xl:text-[11px] text-gray-500 dark:text-gray-400 leading-tight xl:leading-relaxed px-1">Track work hours, shifts, and leave approvals.</div>
                    </div>
                    <div className="text-center">
                        <div className="w-8 h-8 lg:w-9 lg:h-9 xl:w-12 xl:h-12 mx-auto rounded-full flex items-center justify-center mb-1 xl:mb-3" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                            <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" style={{ color: PRIMARY_COLOR }} />
                        </div>
                        <div className="text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white mb-0.5 xl:mb-1">Payroll &amp; Payslips</div>
                        <div className="text-[10px] xl:text-[11px] text-gray-500 dark:text-gray-400 leading-tight xl:leading-relaxed px-1">Automate salaries, allowances, and payslip generation.</div>
                    </div>
                    <div className="text-center">
                        <div className="w-8 h-8 lg:w-9 lg:h-9 xl:w-12 xl:h-12 mx-auto rounded-full flex items-center justify-center mb-1 xl:mb-3" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                            <Award className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" style={{ color: PRIMARY_COLOR }} />
                        </div>
                        <div className="text-[11px] xl:text-[12px] font-bold text-gray-900 dark:text-white mb-0.5 xl:mb-1">Performance &amp; HR</div>
                        <div className="text-[10px] xl:text-[11px] text-gray-500 dark:text-gray-400 leading-tight xl:leading-relaxed px-1">Evaluate goals, feedback, and organizational growth.</div>
                    </div>
                </div>
            </div>
        </>
    );
}

function RegisterPromo() {
    return (
        <div className="w-full">
            <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-[38px] font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                    Empower Your HR Operations<br />
                    in <span style={{ color: PRIMARY_COLOR }}>One Place</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-md mx-auto leading-relaxed">
                    Streamline employee management, attendance, payroll, and team productivity from one modern platform.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                {/* Card 1 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">Employee Management</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Centralize employee profiles, departments, and roles.</p>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Clock className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">Attendance &amp; Leaves</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Track work hours, shifts, and approve leave requests.</p>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <FileText className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">Payroll Management</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Automate salary calculations, allowances, and payslips.</p>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Award className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">Performance &amp; Growth</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Assess performance goals, feedback, and employee growth.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ForgotPasswordPromo() {
    return (
        <div className="w-full">
            <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-[36px] font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                    Get Back to <span style={{ color: PRIMARY_COLOR }}>Your HR Portal</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-md mx-auto leading-relaxed">
                    Forgot your password? Recover your account securely and get back to managing your workforce effectively.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
                {/* Card 1 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <ShieldCheck className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Verify Your Account</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Confirm your email details securely.</p>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <LinkIcon className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Recover Access</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Receive a password reset link directly to your inbox.</p>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Briefcase className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Keep HR Operations Running</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Return to your daily attendance, payroll, and tasks.</p>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Stay Connected</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Reconnect with your employees and HR team.</p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <div className="w-10 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                <span className="text-[15px] text-gray-500 dark:text-gray-400">Your HR workspace is only a step away.</span>
            </div>
        </div>
    );
}

function ResetPasswordPromo() {
    return (
        <div className="w-full">
            <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-[36px] font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                    A Fresh Start for <span style={{ color: PRIMARY_COLOR }}>Secure HR Access</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-md mx-auto leading-relaxed">
                    Create a new password and get back to managing your workforce with confidence.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
                {/* Card 1 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <ShieldCheck className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Protect Your Data</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Keep sensitive employee records secure.</p>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Clock className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Manage Time &amp; Attendance</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Return to work logs, shifts, and leaves.</p>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <FileText className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Process Payroll</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Continue managing salaries and payslips.</p>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start rtl:space-x-reverse space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                        <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 mt-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs tracking-wide mb-1.5">Stay Connected</h4>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed ltr:pr-2 rtl:pl-2">Return to your employees and HR team.</p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <div className="w-10 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                <span className="text-[15px] text-gray-500 dark:text-gray-400">One secure account. Everything your HR operations need.</span>
            </div>
        </div>
    );
}
