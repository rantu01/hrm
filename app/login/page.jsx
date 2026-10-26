'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthLayout } from '@/components/auth-layout';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message =
                    data.message ||
                    (Array.isArray(data.errors)
                        ? data.errors.map((er) => er.msg || er.message).join(', ')
                        : null) ||
                    'Login failed. Please try again.';
                setError(message);
                return;
            }
            // Auth cookie is set httpOnly by the server; go to the app.
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
            title="Sign In"
            description="Enter your credentials to access your account"
            icon={<LogIn className="h-5 w-5 text-brand-charcoal" />}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="rounded-lg border border-brand-red bg-brand-red px-4 py-3 text-sm text-brand-red border-brand-red bg-brand-red text-brand-red">
                        {error}
                    </div>
                )}
                {/* Email Field */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-brand-charcoal dark:text-brand-white">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-charcoal" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-11 rounded-lg border-brand-charcoal/20 border-brand-charcoal/20 bg-white dark:bg-brand-charcoal focus:border-brand-yellow focus:ring-brand-yellow transition-colors"
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-brand-charcoal dark:text-brand-white">
                            Password
                        </Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-brand-charcoal hover:text-brand-charcoal dark:text-brand-yellow dark:hover:text-brand-charcoal transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-charcoal" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-10 pr-10 h-11 rounded-lg border-brand-charcoal/20 border-brand-charcoal/20 bg-white dark:bg-brand-charcoal focus:border-brand-yellow focus:ring-brand-yellow transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-charcoal hover:text-brand-charcoal dark:hover:text-brand-charcoal transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="border-brand-charcoal/20 border-brand-charcoal/20 data-[state=checked]:bg-brand-yellow data-[state=checked]:border-brand-yellow"
                    />
                    <Label
                        htmlFor="remember-me"
                        className="text-sm font-medium text-brand-charcoal dark:text-brand-white cursor-pointer"
                    >
                        Remember me for 30 days
                    </Label>
                </div>

                {/* Sign In Button */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-brand-yellow hover:bg-brand-yellow text-brand-charcoal font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Signing in...
                        </div>
                    ) : (
                        'Sign In'
                    )}
                </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
                <p className="text-sm text-brand-charcoal dark:text-brand-white">
                    Don&apos;t have an account?{' '}
                    <Link
                        href="/register"
                        className="font-medium text-brand-charcoal hover:text-brand-charcoal dark:text-brand-yellow dark:hover:text-brand-charcoal transition-colors"
                    >
                        Create an account
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
