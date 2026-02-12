import { API_BASE_URL, getCommonHeaders } from './config';

const BASE_URL = `${API_BASE_URL}/v4/human-token`;



interface SendOtpResponse {
    status: string;
    message: string;
    data: {
        mh: string;
    };
}

interface VerifyOtpResponse {
    status: string;
    message: string;
    data: {
        is_verified: boolean;
        access_token: string;
        pii_user: {
            height: number;
            weight: number;
            name: string;
            mobile: string;
        };
    };
}


export const authService = {
    async sendOtp(mobile: string, countryCode: string = '91'): Promise<string> {
        try {
            const response = await fetch(`${BASE_URL}/lead/send-otp`, {
                method: 'POST',
                headers: getCommonHeaders(null),
                body: JSON.stringify({
                    country_code: countryCode.replace('+', ''), // Handle '+91' -> '91'
                    mobile,
                    service: 'DH_VERIFICATION',
                    is_whatsapp_consent: false,
                    cf_turnstile_response: 'XXXX.DUMMY.TOKEN.XXXX', // As per requirement
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send OTP');
            }

            const data: SendOtpResponse = await response.json();
            return data.data.mh;
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }
    },

    async verifyOtp(mh: string, otp: string, countryCode: string = '91'): Promise<VerifyOtpResponse['data']> {
        try {
            const response = await fetch(`${BASE_URL}/lead/verify-otp`, {
                method: 'POST',
                headers: getCommonHeaders(null),
                body: JSON.stringify({
                    mh,
                    otp,
                    country_code: countryCode.replace('+', ''),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to verify OTP');
            }

            const data: VerifyOtpResponse = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    },
};
