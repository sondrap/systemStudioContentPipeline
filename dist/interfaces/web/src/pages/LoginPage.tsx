import { useState, useRef, useEffect, useCallback } from 'react';
import { auth } from '@mindstudio-ai/interface';
import { IconLoader2 } from '@tabler/icons-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendCode = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const { verificationId: vid } = await auth.sendEmailCode(email.trim());
      setVerificationId(vid);
      setResendTimer(30);
    } catch (err: any) {
      setError(err.code === 'rate_limited' ? 'Too many attempts. Try again later.' : err.message);
    } finally {
      setSending(false);
    }
  };

  // Auto-focus first digit when entering code screen
  useEffect(() => {
    if (verificationId) {
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    }
  }, [verificationId]);

  const handleVerify = useCallback(async (fullCode: string) => {
    if (verifying) return;
    setVerifying(true);
    setError('');
    try {
      await auth.verifyEmailCode(verificationId, fullCode);
      // onAuthStateChanged fires, App re-renders
    } catch (err: any) {
      if (err.code === 'invalid_code') setError('Wrong code. Try again.');
      else if (err.code === 'verification_expired') setError('Code expired. Request a new one.');
      else if (err.code === 'max_attempts_exceeded') setError('Too many attempts. Request a new code.');
      else setError(err.message);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  }, [verificationId, verifying]);

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const full = newCode.join('');
      if (full.length === 6) {
        handleVerify(full);
      } else {
        digitRefs.current[Math.min(index + digits.length, 5)]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    const full = newCode.join('');
    if (full.length === 6) {
      handleVerify(full);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #ECD8DC 0%, transparent 70%)',
        top: '-15%',
        right: '-8%',
        opacity: 0.4,
        filter: 'blur(80px)',
        animation: 'drift1 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #D4E4F1 0%, transparent 70%)',
        bottom: '-12%',
        left: '-5%',
        opacity: 0.35,
        filter: 'blur(80px)',
        animation: 'drift2 25s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(15px, -20px, 0); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-20px, 12px, 0); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        position: 'relative',
        zIndex: 1,
        animation: 'fadeInUp 400ms ease-out',
      }}>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Icon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--deep-current)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(54, 83, 103, 0.15)',
        }}>
          <img
            src="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/eee84c19-5df7-44c3-aeed-fc6395964065.png?w=64&dpr=3"
            alt="SystemStudio Pipeline"
            style={{ width: 36, height: 36, filter: 'brightness(2.5)' }}
          />
        </div>

        {/* Card */}
        <div style={{
          width: 380,
          maxWidth: '90vw',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 24px rgba(54, 83, 103, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>SystemStudio Pipeline</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Your editorial workspace</p>
          </div>

          {!verificationId ? (
            /* Email entry */
            <>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="Email address"
                autoFocus
                disabled={sending}
              />
              <button
                className="btn btn-primary"
                onClick={handleSendCode}
                disabled={!email.trim() || sending}
                style={{ width: '100%', height: 44, justifyContent: 'center' }}
              >
                {sending ? <IconLoader2 size={16} className="spinner" /> : 'Send Code'}
              </button>
            </>
          ) : (
            /* Code entry */
            <>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>Check your email</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{email}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { digitRefs.current[i] = el; }}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted) handleDigitChange(0, pasted);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    disabled={verifying}
                    style={{
                      width: 48,
                      height: 56,
                      border: `1.5px solid ${digit ? 'var(--border-active)' : 'var(--border)'}`,
                      borderRadius: 10,
                      textAlign: 'center',
                      fontSize: 24,
                      fontFamily: "'Bespoke Serif', serif",
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      background: 'var(--surface)',
                      outline: 'none',
                      transition: 'border-color 150ms',
                    }}
                  />
                ))}
              </div>

              {verifying && (
                <div style={{ textAlign: 'center' }}>
                  <IconLoader2 size={20} className="spinner" style={{ color: 'var(--text-secondary)' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13 }}>
                <button
                  onClick={() => {
                    if (resendTimer > 0) return;
                    handleSendCode();
                  }}
                  style={{
                    color: resendTimer > 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                    cursor: resendTimer > 0 ? 'default' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  {resendTimer > 0 ? `Resend code (${resendTimer}s)` : 'Resend code'}
                </button>
                <button
                  onClick={() => {
                    setVerificationId('');
                    setCode(['', '', '', '', '', '']);
                    setError('');
                  }}
                  style={{ color: 'var(--text-secondary)', fontSize: 13 }}
                >
                  Use a different email
                </button>
              </div>
            </>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>systemstudio.ai</p>
      </div>
    </div>
  );
}
