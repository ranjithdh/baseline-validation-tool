import React, { useState } from 'react';
import styles from './login.module.css';
import MobileInputStep from './MobileInputStep';
import OTPVerificationStep from './OTPVerificationStep';
import { authService } from '../../services/authService';

interface LoginContainerProps {
    onLoginSuccess?: () => void;
}

const LoginContainer: React.FC<LoginContainerProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
    const [phoneNumber, setPhoneNumber] = useState('');
    const countryCode = '+91'; // Static for now, state removed to fix lint
    const [mhToken, setMhToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (phone: string) => {
        setLoading(true);
        setError('');
        const mobileNumber = phone.replace(countryCode, '').trim(); // Extract just the number

        try {
            const mh = await authService.sendOtp(mobileNumber, countryCode);
            setMhToken(mh);
            setPhoneNumber(mobileNumber);
            setStep('OTP');
        } catch (err) {
            setError('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (otp: string) => {
        setLoading(true);
        setError('');

        try {
            const data = await authService.verifyOtp(mhToken, otp, countryCode);
            if (data.is_verified) {
                // Save necessary data
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_height', data.pii_user.height.toString());
                localStorage.setItem('user_weight', data.pii_user.weight.toString());

                if (onLoginSuccess) {
                    onLoginSuccess();
                } else {
                    setStep('SUCCESS');
                }
            } else {
                setError('Invalid OTP');
            }
        } catch (err) {
            setError('Invalid OTP or verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('PHONE');
        setError('');
    };

    const handleResend = async () => {
        try {
            const mh = await authService.sendOtp(phoneNumber, countryCode);
            setMhToken(mh);
            alert('OTP Resent!');
        } catch (err) {
            alert('Failed to resend OTP');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

                {step === 'PHONE' && (
                    <MobileInputStep
                        onSendOtp={handleSendOtp}
                        isLoading={loading}
                    />
                )}

                {step === 'OTP' && (
                    <OTPVerificationStep
                        phoneNumber={`${countryCode} ${phoneNumber}`}
                        onVerify={handleVerifyOtp}
                        onBack={handleBack}
                        onResend={handleResend}
                        isLoading={loading}
                    />
                )}

                {step === 'SUCCESS' && (
                    <div className={styles.animateSlideIn} style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div className={styles.iconWrapper} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: 64, height: 64, borderRadius: 32 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 className={styles.title}>Welcome Back!</h2>
                        <p className={styles.subtitle}>You have successfully logged in.</p>
                        <button
                            className={styles.submitButton}
                            style={{ marginTop: '2rem' }}
                            onClick={() => window.location.reload()}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginContainer;
