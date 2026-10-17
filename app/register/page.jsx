'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthLayout } from '@/components/auth-layout';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [error, setError] = useState('');

    const calculatePasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        setPasswordStrength(strength);
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 1) return 'bg-red-500';
        if (passwordStrength === 2) return 'bg-yellow-500';
        if (passwordStrength === 3) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getStrengthText = () => {
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength === 2) return 'Fair';
        if (passwordStrength === 3) return 'Good';
        return 'Strong';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!agreeTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message =
                    data.message ||
                    (Array.isArray(data.errors)
                        ? data.errors.map((er) => er.msg || er.message).join(', ')
                        : null) ||
                    'Registration failed. Please try again.';
                setError(message);
                return;
            }
            // Register sets the auth cookie; go straight to the app.
            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('Unable to reach the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create Account"
            description="Start your journey with HRM SaaS today"
            icon={<UserPlus className="h-5 w-5 text-blue-500" />}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                        {error}
                    </div>
                )}
                {/* Name Field */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="pl-10 h-11 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-11 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                calculatePasswordStrength(e.target.value);
                            }}
                            required
                            minLength={8}
                            className="pl-10 pr-10 h-11 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {password && (
                        <div className="space-y-1">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-colors ${
                                            i <= passwordStrength ? getStrengthColor() : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Password strength: <span className="font-medium">{getStrengthText()}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="pl-10 pr-10 h-11 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {confirmPassword && password === confirmPassword && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                            <Check className="h-3 w-3" />
                            Passwords match
                        </div>
                    )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start space-x-2 rtl:space-x-reverse pt-1">
                    <Checkbox
                        id="terms"
                        checked={agreeTerms}
                        onCheckedChange={setAgreeTerms}
                        className="border-gray-300 dark:border-gray-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 mt-0.5"
                    />
                    <Label
                        htmlFor="terms"
                        className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed"
                    >
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-500 hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-blue-500 hover:underline">
                            Privacy Policy
                        </Link>
                    </Label>
                </div>

                {/* Create Account Button */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Creating account...
                        </div>
                    ) : (
                        'Create Account'
                    )}
                </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
