import { Drug } from '../types/calculator';

export const DRUG_DATABASE: Drug[] = [
    {
        id: 'amoxicillin',
        genericName: 'Amoxicillin',
        brandNames: ['Amoxil', 'Moxatag'],
        category: 'Antibiotic',
        formulations: [
            { type: 'syrup', concentrationMg: 125, perMl: 5, label: 'Suspension 125mg/5ml' },
            { type: 'syrup', concentrationMg: 250, perMl: 5, label: 'Suspension 250mg/5ml' },
            { type: 'syrup', concentrationMg: 400, perMl: 5, label: 'Suspension 400mg/5ml' },
            { type: 'tablet', concentrationMg: 500, label: 'Tablet 500mg' },
        ],
        dosageRules: [
            {
                indication: 'Mild/Moderate Infection',
                doseMgPerKgDay: 25,
                divideInto: 2, // q12h
                maxDailyDoseMg: 875,
                frequencyLabel: 'Every 12 hours',
            },
            {
                indication: 'Severe Infection / Otitis Media',
                doseMgPerKgDay: 45,
                divideInto: 2,
                maxDailyDoseMg: 1750,
                frequencyLabel: 'Every 12 hours',
            },
            {
                indication: 'Severe Infection (High Dose)',
                doseMgPerKgDay: 90,
                divideInto: 2,
                maxDailyDoseMg: 4000,
                frequencyLabel: 'Every 12 hours',
                notes: 'High dose strategy for resistant Streptococcus pneumoniae.'
            }
        ]
    },
    {
        id: 'ibuprofen',
        genericName: 'Ibuprofen',
        brandNames: ['Advil', 'Motrin'],
        category: 'Analgesic / Antipyretic',
        warning: 'Do not use under 6 months of age.',
        formulations: [
            { type: 'drop', concentrationMg: 50, perMl: 1.25, label: 'Infant Drops 50mg/1.25ml' },
            { type: 'syrup', concentrationMg: 100, perMl: 5, label: 'Children\'s Suspension 100mg/5ml' },
            { type: 'tablet', concentrationMg: 200, label: 'Tablet 200mg' },
        ],
        dosageRules: [
            {
                indication: 'Fever / Pain (Standard)',
                minAgeMonths: 6,
                doseMgPerKg: 5, // Per dose! Not per day.
                divideInto: 1, // Logic handles "per dose", multiply by freq if needed for daily check
                maxDailyDoseMg: 1200, // General max
                frequencyLabel: 'Every 6-8 hours',
                notes: 'Temperature < 39.2°C (102.5°F)'
            },
            {
                indication: 'High Fever',
                minAgeMonths: 6,
                doseMgPerKg: 10,
                maxDailyDoseMg: 2400, // 40mg/kg/day max usually
                frequencyLabel: 'Every 6-8 hours',
                notes: 'Temperature > 39.2°C (102.5°F). Max 40mg/kg/day.'
            }
        ]
    },
    {
        id: 'paracetamol',
        genericName: 'Acetaminophen (Paracetamol)',
        brandNames: ['Tylenol', 'Panadol'],
        category: 'Analgesic / Antipyretic',
        formulations: [
            { type: 'drop', concentrationMg: 80, perMl: 0.8, label: 'Infant Drops 80mg/0.8ml (Old Conc)' },
            { type: 'syrup', concentrationMg: 160, perMl: 5, label: 'Suspension 160mg/5ml' },
            { type: 'tablet', concentrationMg: 325, label: 'Tablet 325mg' },
            { type: 'tablet', concentrationMg: 500, label: 'Tablet 500mg' },
        ],
        dosageRules: [
            {
                indication: 'Fever / Pain',
                doseMgPerKg: 15, // 10-15 mg/kg/dose
                maxDailyDoseMg: 4000, // Adult max
                frequencyLabel: 'Every 4-6 hours',
                notes: 'Do not exceed 5 doses in 24 hours. Max 75mg/kg/day.'
            }
        ]
    },
    {
        id: 'azithromycin',
        genericName: 'Azithromycin',
        brandNames: ['Zithromax'],
        category: 'Antibiotic',
        formulations: [
            { type: 'syrup', concentrationMg: 100, perMl: 5, label: 'Suspension 100mg/5ml' },
            { type: 'syrup', concentrationMg: 200, perMl: 5, label: 'Suspension 200mg/5ml' },
            { type: 'tablet', concentrationMg: 250, label: 'Tablet 250mg' },
            { type: 'tablet', concentrationMg: 500, label: 'Tablet 500mg' },
        ],
        dosageRules: [
            {
                indication: 'Standard (5 Day Course) - Day 1',
                doseMgPerKg: 10,
                maxDailyDoseMg: 500,
                frequencyLabel: 'Once Daily (Day 1)',
            },
            {
                indication: 'Standard (5 Day Course) - Days 2-5',
                doseMgPerKg: 5,
                maxDailyDoseMg: 250,
                frequencyLabel: 'Once Daily (Days 2-5)',
            },
            {
                indication: 'Otitis Media (Single Dose)',
                doseMgPerKg: 30,
                maxDailyDoseMg: 1500,
                frequencyLabel: 'Single Dose',
            },
            {
                indication: 'Adult/Adolescent Standard',
                minAgeMonths: 144, // 12 years
                fixedDoseMg: 500,
                frequencyLabel: 'Once Daily for 3 Days',
                notes: 'Common adult regimen (500mg daily).'
            }
        ]
    }
];
