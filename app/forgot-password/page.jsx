'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth-layout';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // TODO: Implement actual password reset logic
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log('Password reset requested for:', email);
        setIsLoading(false);
        setIsSubmitted(true);
    };

    return (
        <AuthLayout
            title="Forgot Password?"
            description="Enter your email and we'll send you a reset link"
            icon={<KeyRound className="h-5 w-5 text-brand-charcoal" />}
        >
            {isSubmitted ? (
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow dark:bg-brand-charcoal flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-brand-charcoal" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-white">
                            Check your email
                        </h3>
                        <p className="text-sm text-brand-charcoal dark:text-brand-white">
                            We&apos;ve sent a password reset link to{' '}
                            <span className="font-medium text-brand-charcoal dark:text-white">{email}</span>
                        </p>
                    </div>
                    <p className="text-sm text-brand-charcoal dark:text-brand-white">
                        Didn&apos;t receive the email? Check your spam folder or{' '}
                        <button
                            onClick={() => setIsSubmitted(false)}
                            className="text-brand-charcoal hover:underline font-medium"
                        >
                            try again
                        </button>
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
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
                        <p className="text-xs text-brand-charcoal dark:text-brand-white">
                            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 rounded-lg bg-brand-yellow hover:bg-brand-yellow text-brand-charcoal font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Sending reset link...
                            </div>
                        ) : (
                            'Send Reset Link'
                        )}
                    </Button>
                </form>
            )}

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-charcoal hover:text-brand-charcoal dark:text-brand-yellow dark:hover:text-brand-charcoal transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    Back to Sign In
                </Link>
            </div>
        </AuthLayout>
    );
}
