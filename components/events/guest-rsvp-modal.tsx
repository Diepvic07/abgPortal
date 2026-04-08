'use client';

import { useState } from 'react';
import { CommunityEvent } from '@/types';
import { EventPaymentFlow } from './event-payment-flow';
import { useTranslation } from '@/lib/i18n';

interface GuestRsvpModalProps {
  event: CommunityEvent;
  onClose: () => void;
  onSuccess: () => void;
}

export function GuestRsvpModal({ event, onClose, onSuccess }: GuestRsvpModalProps) {
  const { locale } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rsvpComplete, setRsvpComplete] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);

  const t = locale === 'vi' ? {
    paymentRequired: 'Cần thanh toán',
    registerAsGuest: 'Đăng ký với tư cách khách',
    guestName: 'Họ tên',
    guestEmail: 'Email',
    guestPhone: 'Số điện thoại',
    guestNamePlaceholder: 'Họ tên đầy đủ',
    guestEmailPlaceholder: 'email@example.com',
    guestPhonePlaceholder: 'Không bắt buộc',
    guestFeeNote: 'Thông tin thanh toán sẽ hiển thị sau khi đăng ký.',
    cancel: 'Hủy',
    register: 'Đăng ký',
    registering: 'Đang đăng ký...',
    registrationSuccess: 'Đăng ký thành công!',
    registrationSuccessMessage: 'Bạn đã đăng ký tham gia sự kiện này. Hẹn gặp bạn tại sự kiện!',
    questionLabel: 'Câu hỏi dành cho diễn giả',
    questionPlaceholder: 'Nhập câu hỏi bạn muốn gửi cho diễn giả...',
    done: 'Xong',
  } : {
    paymentRequired: 'Payment Required',
    registerAsGuest: 'Register as Guest',
    guestName: 'Name',
    guestEmail: 'Email',
    guestPhone: 'Phone',
    guestNamePlaceholder: 'Your full name',
    guestEmailPlaceholder: 'your@email.com',
    guestPhonePlaceholder: 'Optional',
    guestFeeNote: 'Payment details will be shown after registration.',
    cancel: 'Cancel',
    register: 'Register',
    registering: 'Registering...',
    registrationSuccess: 'Registration Successful!',
    registrationSuccessMessage: 'You have been registered for this event. We look forward to seeing you!',
    questionLabel: 'Question for the speaker',
    questionPlaceholder: 'Enter your question for the speaker...',
    done: 'Done',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/public/events/${event.id}/guest-rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_name: name, guest_email: email, guest_phone: phone || undefined, question: question.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      if (data.requires_payment && data.payment) {
        setPaymentId(data.payment.id);
        setRequiresPayment(true);
        setRsvpComplete(true);
      } else {
        setRsvpComplete(true);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // Show payment flow after RSVP
  if (rsvpComplete && requiresPayment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t.paymentRequired}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="p-6">
            <EventPaymentFlow
              event={event}
              payerType="guest"
              payerName={name}
              payerEmail={email}
              payerPhone={phone || undefined}
              paymentId={paymentId!}
              onComplete={() => { onSuccess(); onClose(); }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show success (free event)
  if (rsvpComplete) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t.registrationSuccess}</h3>
          <p className="text-gray-600 mb-6">{t.registrationSuccessMessage}</p>
          <button
            onClick={() => { onSuccess(); onClose(); }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            {t.done}
          </button>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t.registerAsGuest}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.guestName} *</label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.guestNamePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.guestEmail} *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.guestEmailPlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.guestPhone}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.guestPhonePlaceholder}
            />
          </div>

          {event.require_question && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {event.question_prompt || t.questionLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                maxLength={2000}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${event.require_question && !question.trim() ? 'border-red-300' : 'border-gray-300'}`}
                placeholder={t.questionPlaceholder}
              />
            </div>
          )}

          {event.fee_guest != null && event.fee_guest > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              {t.guestPhone === 'Số điện thoại' ? 'Phí khách' : 'Guest fee'}: <span className="font-semibold">{new Intl.NumberFormat('vi-VN').format(event.fee_guest)} VND</span>
              <br />
              <span className="text-xs">{t.guestFeeNote}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || (event.require_question && !question.trim())}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {loading ? t.registering : t.register}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
