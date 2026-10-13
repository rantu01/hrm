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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // TODO: Implement actual authentication logic
        // For now, simulate a login attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log('Login attempt:', { email, password, rememberMe });
        setIsLoading(false);

        // Redirect to dashboard on success
        router.push('/dashboard');
    };

    return (
        <AuthLayout
            title="Sign In"
            description="Enter your credentials to access your account"
            icon={<LogIn className="h-5 w-5 text-blue-500" />}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Password
                        </Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
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
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="border-gray-300 dark:border-gray-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <Label
                        htmlFor="remember-me"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                        Remember me for 30 days
                    </Label>
                </div>

                {/* Sign In Button */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Don&apos;t have an account?{' '}
                    <Link
                        href="/register"
                        className="font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                        Create an account
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
