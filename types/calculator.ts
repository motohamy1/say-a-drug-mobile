export enum WeightUnit {
    KG = 'kg',
    LB = 'lb',
}

export interface Formulation {
    type: 'syrup' | 'tablet' | 'capsule' | 'drop' | 'injection';
    concentrationMg: number;
    perMl?: number; // For liquids: e.g., 250mg per 5ml -> concentrationMg=250, perMl=5
    label: string; // e.g., "Suspension 250mg/5ml"
}

export interface DosageRule {
    indication: string; // e.g., "General Infection", "Otitis Media"
    minAgeMonths?: number;
    maxAgeMonths?: number; // 0-18 years usually 0-216 months
    doseMgPerKgDay?: number; // Total daily dose based on weight
    doseMgPerKg?: number; // Per single dose based on weight (alternative to daily)
    fixedDoseMg?: number; // Fixed dose regardless of weight (e.g., 500mg for Adults)
    divideInto?: number; // Number of doses per day (e.g., 3 for q8h)
    maxDailyDoseMg?: number; // Safety cap
    frequencyLabel: string; // e.g., "Every 8 hours"
    notes?: string;
}

export interface Drug {
    id: string;
    genericName: string;
    brandNames: string[];
    category: string;
    formulations: Formulation[];
    dosageRules: DosageRule[];
    warning?: string;
}

export interface CalculationResult {
    ruleUsed: DosageRule;
    weightKg: number;
    isEstimatedWeight: boolean; // Flag to indicate if weight was estimated from age
    totalDailyDoseMg: number;
    singleDoseMg: number;
    singleDoseVolumeMl?: number; // Only for liquids
    formulation: Formulation;
    isMaxDoseCapReached: boolean;
    warnings: string[];
}
