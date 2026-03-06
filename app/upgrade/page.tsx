import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UpgradePremiumPrompt } from '@/components/upgrade-premium-prompt';

export const metadata = {
    title: 'Pay Membership – ABG Alumni Connect',
    description: 'Complete your ABG Alumni membership payment to unlock Premium features.',
};

export default async function UpgradePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-12">
                <UpgradePremiumPrompt />
            </div>
        </main>
    );
}
