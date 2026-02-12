import React, { useState, useRef, useEffect } from 'react';
import styles from './login.module.css';

interface OTPVerificationStepProps {
    phoneNumber: string;
    onVerify: (otp: string) => void;
    onBack: () => void;
    onResend: () => void;
    isLoading?: boolean;
}

const OTP_LENGTH = 6;

const OTPVerificationStep: React.FC<OTPVerificationStepProps> = ({
    phoneNumber,
    onVerify,
    onBack,
    onResend,
    isLoading = false
}) => {
    const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(30);
    const [isError, setIsError] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        inputsRef.current[0]?.focus();

        // Timer countdown
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        // Allow only single digit
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto-advance
        if (value && index < OTP_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus();
        }

        // Auto-submit if full
        const combinedOtp = newOtp.join('');
        if (combinedOtp.length === OTP_LENGTH && newOtp.every(val => val !== '')) {
            // Small delay for visual feedback
            setTimeout(() => onVerify(combinedOtp), 300);
        }

        setIsError(false);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, OTP_LENGTH).split('');
        if (pastedData.every(char => !isNaN(Number(char)))) {
            const newOtp = [...otp];
            pastedData.forEach((char, index) => {
                if (index < OTP_LENGTH) newOtp[index] = char;
            });
            setOtp(newOtp);
            inputsRef.current[Math.min(pastedData.length, OTP_LENGTH - 1)]?.focus();
        }
    };

    const handleResend = () => {
        if (timer === 0) {
            setTimer(30);
            onResend();
            setOtp(new Array(OTP_LENGTH).fill(''));
            inputsRef.current[0]?.focus();
        }
    };

    return (
        <div className={styles.animateSlideIn}>
            <div className={styles.header}>
                <div className={styles.iconWrapper} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h2 className={styles.title}>Verify Phone</h2>
                <p className={styles.subtitle}>
                    Code sent to <span style={{ color: '#fff', fontWeight: 500 }}>{phoneNumber}</span>
                </p>
                <button onClick={onBack} className={styles.secondaryButton} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', margin: '0.5rem auto 0' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit Number
                </button>
            </div>

            <div className={styles.formGroup}>
                <div className={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputsRef.current[index] = el; }}
                            className={`${styles.otpDigit} ${digit ? styles.filled : ''} ${isError ? styles.error : ''}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            inputMode="numeric"
                        />
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    {timer > 0 ? (
                        <p className={styles.subtitle}>Resend code in <span style={{ color: '#3b82f6' }}>00:{timer.toString().padStart(2, '0')}</span></p>
                    ) : (
                        <button onClick={handleResend} className={styles.secondaryButton} style={{ color: '#3b82f6' }}>
                            Resend OTP
                        </button>
                    )}
                </div>

                <button
                    className={styles.submitButton}
                    disabled={otp.some(d => !d) || isLoading}
                    onClick={() => onVerify(otp.join(''))}
                >
                    {isLoading ? 'Verifying...' : 'Verify & Proceed'}
                </button>
            </div>
        </div>
    );
};

export default OTPVerificationStep;
