import express from 'express';
import cors from 'cors';
import { calculateBaselineScore } from '../../src/utils/scoreCalculator';
import { TIER_DATA } from '../../src/data/tierData';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Global JSON error handler
app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON input',
            details: err.message
        });
    }
    next();
});

// Hardcoded BMI value as per requirements
const HARDCODED_BMI = 22.0;

app.get('/', (req, res) => {
    res.json({
        message: 'DeepHolistics Standalone Baseline Score API',
        endpoints: {
            score: '/api/calculate-score',
            health: '/health'
        }
    });
});

app.post('/api/calculate-score', async (req, res) => {
    try {
        const { biomarkers, customTierData } = req.body;

        if (!biomarkers || !Array.isArray(biomarkers)) {
            return res.status(400).json({ error: 'biomarkers array is required' });
        }

        // 1. Structure the biomarkers for the calculation engine
        const healthData = {
            data: {
                blood: {
                    data: biomarkers.map((b: any) => {
                        // Normalize names to match TIER_DATA for the logic engine
                        const normalizedName = TIER_DATA.find(t =>
                            t.name.toLowerCase() === b.biomarker_name?.toLowerCase() ||
                            t.name.toLowerCase().includes(b.biomarker_name?.toLowerCase()) ||
                            b.biomarker_name?.toLowerCase().includes(t.name.toLowerCase())
                        )?.name || b.biomarker_name;

                        return {
                            metric_id: b.metric_id,
                            display_name: normalizedName,
                            display_rating: 'manual',
                            value: b.value || 0,
                            unit: b.unit || '',
                            ranges: [{
                                display_rating: 'manual',
                                rating_rank: b.rating_rank
                            }]
                        };
                    })
                }
            }
        };

        // 2. Calculate Score using shared logic and hardcoded BMI
        const result = calculateBaselineScore(healthData as any, HARDCODED_BMI, customTierData || TIER_DATA);

        if (!result) {
            return res.status(500).json({ error: 'Failed to calculate score' });
        }

        res.json({
            status: 'success',
            input_bmi_used: HARDCODED_BMI,
            result: result
        });

    } catch (error: any) {
        console.error('Error calculating score:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'standalone' });
});

app.listen(PORT, () => {
    console.log(`Standalone Score Server running on http://localhost:${PORT}`);
});
