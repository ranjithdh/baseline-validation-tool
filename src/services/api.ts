export interface BloodRange {
    id: string;
    metric_id: string;
    display_name: string;
    range: string;
    display_rating: string;
    rating_rank: number;
    unit: string;
}

export interface BloodCause {
    id: string;
    type: 'increase' | 'decrease';
    name: string;
    description: string | null;
}

export interface BloodBiomarker {
    id: string;
    metric_id: string;
    display_name: string;
    value: number;
    range: string;
    unit: string;
    display_description: string;
    display_rating: string;
    group_name: string;
    ranges: BloodRange[];
    causes: BloodCause[];
}

export interface PIIData {
    _id: string;
    lead_id: string;
    country_code: string;
    email: string;
    mobile: string;
    name: string;
    dob: string;
    gender: string;
    height: number;
    weight: number;
    customer_id: string;
}

export interface PIIDataResponse {
    status: string;
    message: string;
    data: {
        pii_data: PIIData;
    };
}

export interface HealthDataResponse {
    status: string;
    message: string;
    data: {
        blood: {
            data: BloodBiomarker[];
        };
    };
}

import { API_BASE_URL, getCommonHeaders } from './config';



export async function fetchHealthData(): Promise<HealthDataResponse> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/v4/human-token/health-data?metrics[]=blood&metrics[]=symptoms`, {
        method: 'GET',
        headers: getCommonHeaders(token)
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function fetchUserHealthData(userId: string): Promise<HealthDataResponse> {
    const token = localStorage.getItem('access_token');
    // Using the ID from the user object (e.g. "520")
    const response = await fetch(`${API_BASE_URL}/v4/human-token/health-data/user/${userId}?metrics[]=blood&metrics[]=symptoms`, {
        method: 'GET',
        headers: getCommonHeaders(token)
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch user health data: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function fetchPIIData(): Promise<PIIDataResponse> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/v4/human-token/pii-data`, {
        method: 'GET',
        headers: getCommonHeaders(token)
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch PII data: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function fetchUserPIIData(userId: string): Promise<PIIDataResponse> {
    const token = localStorage.getItem('access_token');

    // Pattern guessed based on health-data endpoint: /v4/human-token/pii-data/user/{userId}
    const response = await fetch(`${API_BASE_URL}/v4/human-token/pii-data/user/${userId}`, {
        method: 'GET',
        headers: getCommonHeaders(token)
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch user PII data: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Calculate BMI from height (in cm) and weight (in kg)
 * BMI = weight (kg) / (height (m))^2
 */
export function calculateBMI(height: number, weight: number): number {
    if (!height || !weight || height <= 0 || weight <= 0) {
        return 0;
    }
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}
