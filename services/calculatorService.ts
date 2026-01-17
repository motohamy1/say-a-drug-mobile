import { CalculationResult, Drug, WeightUnit } from '../types/calculator';

/**
 * Estimates weight in KG based on Age in Months using standard APLS formulas.
 * Used when user provides only Age.
 */
export const estimateWeightKg = (ageMonths: number): number => {
    const ageYears = ageMonths / 12;

    // APLS (Advanced Paediatric Life Support) approximation
    if (ageMonths < 12) {
        return (0.5 * ageMonths) + 4;
    }
    if (ageYears <= 5) {
        return (2 * ageYears) + 8;
    }
    if (ageYears <= 14) {
        return (3 * ageYears) + 7;
    }

    // Default fallback for older adolescents/adults if no weight provided
    return 65;
};

/**
 * Pure function to calculate dosage. 
 * Accepts Weight OR Age (or both).
 */
export const calculateDose = (
    drug: Drug,
    weightInput: number | null,
    weightUnit: WeightUnit,
    ageMonthsInput: number | null,
    selectedIndicationIdx: number,
    selectedFormulationIdx: number
): CalculationResult | null => {

    const rule = drug.dosageRules[selectedIndicationIdx];
    const formulation = drug.formulations[selectedFormulationIdx];

    if (!rule || !formulation) return null;

    // 1. Determine Working Weight & Estimation Status
    let weightKg = 0;
    let isEstimatedWeight = false;
    const warnings: string[] = [];

    // Logic: Prefer provided Weight -> Else Estimate from Age -> Else Error (unless Fixed Dose)
    if (weightInput !== null && weightInput > 0) {
        weightKg = weightUnit === WeightUnit.LB ? weightInput * 0.453592 : weightInput;
    } else if (ageMonthsInput !== null) {
        weightKg = estimateWeightKg(ageMonthsInput);
        isEstimatedWeight = true;
        warnings.push(`Weight estimated (${weightKg.toFixed(1)}kg) from age. Verify actual weight.`);
    }

    // 2. Age Validation (Only if age is provided)
    if (ageMonthsInput !== null) {
        if (rule.minAgeMonths !== undefined && ageMonthsInput < rule.minAgeMonths) {
            warnings.push(`Warning: Patient age is below recommended minimum (${rule.minAgeMonths} months).`);
        }
        if (rule.maxAgeMonths !== undefined && ageMonthsInput > rule.maxAgeMonths) {
            // Just a note usually
        }
    } else {
        warnings.push("Age not verified. Check age-specific contraindications.");
    }

    // 3. Calculation Logic
    let singleDoseMg = 0;
    let totalDailyDoseMg = 0;

    // Flag to skip weight calculation if we can't determine weight
    const hasWeight = weightKg > 0;

    if (rule.fixedDoseMg) {
        // Case A: Fixed Dose (e.g. Adult Dose)
        singleDoseMg = rule.fixedDoseMg;
        const divisions = rule.divideInto || 1;
        totalDailyDoseMg = singleDoseMg * divisions;
    } else if (hasWeight) {
        // Case B: Weight Based
        if (rule.doseMgPerKgDay) {
            // Calculated by Daily Dose divided by frequency
            totalDailyDoseMg = weightKg * rule.doseMgPerKgDay;
            const divisions = rule.divideInto || 1;
            singleDoseMg = totalDailyDoseMg / divisions;
        } else if (rule.doseMgPerKg) {
            // Calculated by Single Dose
            singleDoseMg = weightKg * rule.doseMgPerKg;
            // Estimate daily
            const estimatedFreq = rule.divideInto || (rule.frequencyLabel.includes('6') ? 4 : 3);
            totalDailyDoseMg = singleDoseMg * estimatedFreq;
        }
    } else {
        // No Weight, No Age, No Fixed Dose -> Cannot Calculate
        return null;
    }

    // 4. Safety Caps (Max Daily Dose)
    let isMaxDoseCapReached = false;
    if (rule.maxDailyDoseMg) {
        if (totalDailyDoseMg > rule.maxDailyDoseMg) {
            totalDailyDoseMg = rule.maxDailyDoseMg;
            singleDoseMg = totalDailyDoseMg / (rule.divideInto || 1);
            isMaxDoseCapReached = true;
            warnings.push(`Max daily dose of ${rule.maxDailyDoseMg}mg reached.`);
        }
    }

    // 5. Volume Calculation (for liquids)
    let singleDoseVolumeMl: number | undefined = undefined;
    if (formulation.perMl && formulation.concentrationMg) {
        singleDoseVolumeMl = (singleDoseMg / formulation.concentrationMg) * formulation.perMl;
    }

    return {
        ruleUsed: rule,
        weightKg,
        isEstimatedWeight,
        totalDailyDoseMg,
        singleDoseMg,
        singleDoseVolumeMl,
        formulation,
        isMaxDoseCapReached,
        warnings
    };
};
