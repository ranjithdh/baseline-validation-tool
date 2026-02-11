import { METRIC_IDS } from './biomarkerIds';

export interface BaselineCapRule {
    metricId: string;
    caps: { rank: number; capScore: number }[];
}

export const BASELINE_CAPPING_RULES: BaselineCapRule[] = [
    {
        metricId: METRIC_IDS.HBA1C,
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 },
            { rank: 3, capScore: 85 }
        ]
    },
    {
        metricId: METRIC_IDS.FASTING_INSULIN,
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        metricId: METRIC_IDS.BODY_FAT,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.VO2_MAX,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.NON_HDL,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.LPA,
        caps: [
            { rank: 1, capScore: 75 }
        ]
    },
    {
        metricId: METRIC_IDS.HS_CRP,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.GGT,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.TSH,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.VITAMIN_B12,
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        metricId: METRIC_IDS.FERRITIN,
        caps: [
            { rank: 1, capScore: 75 }
        ]
    },
    {
        metricId: METRIC_IDS.PHQ_2,
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        metricId: METRIC_IDS.GAD_2,
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        metricId: METRIC_IDS.VITAMIN_D,
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },

    {
        metricId: METRIC_IDS.SGOT,
        caps: [
            { rank: 1, capScore: 60 },
            { rank: 2, capScore: 65 }
        ]
    },
    {
        metricId: METRIC_IDS.SGPT,
        caps: [
            { rank: 1, capScore: 60 },
            { rank: 2, capScore: 65 }
        ]
    }
];
