import React, { useState } from 'react';
import styles from './login.module.css';

interface MobileInputStepProps {
    onSendOtp: (phoneNumber: string) => void;
    isLoading?: boolean;
}

const MobileInputStep: React.FC<MobileInputStepProps> = ({ onSendOtp, isLoading = false }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const countryCode = '+91'; // Static for now

    const formatPhoneNumber = (value: string) => {
        // Remove non-digits
        const cleaned = value.replace(/\D/g, '');
        // Limit to 10 digits for this demo
        const match = cleaned.substring(0, 10);
        return match;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

    const isValid = phoneNumber.length === 10;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isValid) {
            onSendOtp(`${countryCode} ${phoneNumber}`);
        }
    };

    return (
        <div className={styles.animateSlideIn}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                </div>
                <h2 className={styles.title}>Get Started</h2>
                <p className={styles.subtitle}>Enter your mobile number to continue</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.formGroup}>
                <div className={styles.inputWrapper}>
                    <div className={styles.flagSelect}>
                        <span>🇮🇳</span>
                        <span>+91</span>
                    </div>
                    <input
                        type="tel"
                        className={styles.inputField}
                        placeholder="Mobile Number"
                        value={phoneNumber}
                        onChange={handleChange}
                        autoFocus
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!isValid || isLoading}
                >
                    {isLoading ? <span>Sending...</span> : (
                        <>
                            <span>Send OTP</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </>
                    )}
                </button>
            </form>

            <div className={styles.footer}>
                <p>By continuing, you agree to our <a href="#" className={styles.link}>Terms</a> & <a href="#" className={styles.link}>Privacy Policy</a></p>
            </div>
        </div>
    );
};

export default MobileInputStep;
