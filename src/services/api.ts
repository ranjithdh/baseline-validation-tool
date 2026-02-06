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

export interface HealthDataResponse {
    status: string;
    message: string;
    data: {
        blood: {
            data: BloodBiomarker[];
        };
    };
}

const API_BASE_URL = 'https://api.stg.dh.deepholistics.com';

export async function fetchHealthData(): Promise<HealthDataResponse> {
    const response = await fetch(`${API_BASE_URL}/v4/human-token/health-data?metrics[]=blood&metrics[]=symptoms`, {
        method: 'GET',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'access_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiODViYmE1NjYtZTE2ZC00ZTc1LWI0ZTYtMDcyNDJmMTgzZjQ4Iiwic2Vzc2lvbl9pZCI6IjJjNTNjM2M2LTZlYzctNDMzMC1hMDEzLTZhN2Q1ZDc5ZWFkYiIsInVzZXJfaW50X2lkIjoiMTE2MyIsInByb2ZpbGVfaWQiOiIxMDA5IiwibGVhZF9pZCI6ImQyZmQwZDU2LWVmZGItNGMxNS1iZmMzLTEwOWJhZjQ5ZGM4ZSIsImlhdCI6MTc3MDI5OTM1NiwiZXhwIjoxNzcwOTA0MTU2fQ.LeSys4Bm6Px3m94tPq0-1kYbd4h8girGZUbDJHbhdX8',
            'client_id': 'qXsGPcHJkb9MTwD5fNFpzRrngjtvy4dW',
            'user_timezone': 'Asia/Calcutta',
            'origin': 'https://app.stg.deepholistics.com',
            'referer': 'https://app.stg.deepholistics.com/',
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
