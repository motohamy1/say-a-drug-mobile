import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DRUG_DATABASE } from '../../constants/drugDatabase';
import { calculateDose } from '../../services/calculatorService';
import { Drug as DbDrug, drugService } from '../../services/drugService';
import { WeightUnit } from '../../types/calculator';

export default function CalculatorScreen() {
    // --- State ---
    const [weight, setWeight] = useState<string>('');
    const [weightUnit, setWeightUnit] = useState<WeightUnit>(WeightUnit.KG);
    const [ageYears, setAgeYears] = useState<string>('');
    const [ageMonths, setAgeMonths] = useState<string>('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DbDrug[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Drug Selection
    const [selectedDrugId, setSelectedDrugId] = useState<string>(DRUG_DATABASE[0].id);
    const [selectedIndicationIdx, setSelectedIndicationIdx] = useState<number>(0);
    const [selectedFormulationIdx, setSelectedFormulationIdx] = useState<number>(0);

    // --- Effects ---
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 1) {
                setIsSearching(true);
                const results = await drugService.searchDrugs(searchQuery);
                setSearchResults(results);
                setIsSearching(false);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // --- Derived Data ---
    const selectedDrug = useMemo(() =>
        DRUG_DATABASE.find(d => d.id === selectedDrugId) || DRUG_DATABASE[0],
        [selectedDrugId]);

    // --- Handlers ---
    const handleSelectDbDrug = (dbDrug: DbDrug) => {
        // Try to map to local DB by generic name or trade name
        // Supabase uses 'active_ingredients' and 'Category'
        const drugName = dbDrug.trade_name || '';

        // Ensure activeIng is a string for the comparison
        let activeIng = '';
        if (Array.isArray(dbDrug.active_ingredients)) {
            activeIng = dbDrug.active_ingredients.join(', ');
        } else if (typeof dbDrug.active_ingredients === 'string') {
            activeIng = dbDrug.active_ingredients;
        }

        const genericMatch = DRUG_DATABASE.find(d =>
            activeIng.toLowerCase().includes(d.genericName.toLowerCase()) ||
            d.genericName.toLowerCase().includes(activeIng.toLowerCase())
        );

        if (genericMatch) {
            setSelectedDrugId(genericMatch.id);
            setSelectedIndicationIdx(0);
            setSelectedFormulationIdx(0);
        } else {
            // Fallback: If no rules, we could show a warning or keep current selection
            console.warn("No dosage rules found for", drugName);
        }

        setSearchQuery(drugName);
        setShowResults(false);
    };

    // Calculate Result
    const result = useMemo(() => {
        try {
            if (!selectedDrug) return null;

            const w = weight.trim() === '' ? null : parseFloat(weight);

            let totalAgeMonths: number | null = null;
            if (ageYears.trim() !== '' || ageMonths.trim() !== '') {
                const y = parseFloat(ageYears) || 0;
                const m = parseFloat(ageMonths) || 0;
                totalAgeMonths = (y * 12) + m;
            }

            if ((w === null || isNaN(w)) && (totalAgeMonths === null)) return null;

            return calculateDose(
                selectedDrug,
                w,
                weightUnit,
                totalAgeMonths,
                selectedIndicationIdx,
                selectedFormulationIdx
            );
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [weight, weightUnit, ageYears, ageMonths, selectedDrug, selectedIndicationIdx, selectedFormulationIdx]);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.headerSection}>
                    <Text style={styles.headerTitle}>Dose Calc</Text>
                    <Text style={styles.headerSubtitle}>Pediatric Dosage Support</Text>
                </View>

                {/* Patient Details Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.numberBadge, { backgroundColor: 'rgba(45, 212, 191, 0.2)' }]}>
                            <Text style={[styles.numberText, { color: '#2dd4bf' }]}>1</Text>
                        </View>
                        <Text style={styles.cardTitle}>Patient Details</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.flex1}>
                            <Text style={styles.label}>Weight</Text>
                            <View style={styles.inputWithUnit}>
                                <TextInput
                                    placeholder="0.0"
                                    placeholderTextColor="#4b5563"
                                    keyboardType="numeric"
                                    value={weight}
                                    onChangeText={setWeight}
                                    style={styles.inputFlex}
                                />
                                <View style={styles.unitToggle}>
                                    <TouchableOpacity
                                        onPress={() => setWeightUnit(WeightUnit.KG)}
                                        style={[styles.unitBtn, weightUnit === WeightUnit.KG && styles.unitBtnActive]}
                                    >
                                        <Text style={[styles.unitText, weightUnit === WeightUnit.KG && styles.unitTextActive]}>kg</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setWeightUnit(WeightUnit.LB)}
                                        style={[styles.unitBtn, weightUnit === WeightUnit.LB && styles.unitBtnActive]}
                                    >
                                        <Text style={[styles.unitText, weightUnit === WeightUnit.LB && styles.unitTextActive]}>lb</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.flex1}>
                            <Text style={styles.label}>Age (Years)</Text>
                            <TextInput
                                placeholder="0"
                                placeholderTextColor="#4b5563"
                                keyboardType="numeric"
                                value={ageYears}
                                onChangeText={setAgeYears}
                                style={styles.input}
                            />
                        </View>
                        <View style={styles.spacer} />
                        <View style={styles.flex1}>
                            <Text style={styles.label}>Age (Months)</Text>
                            <TextInput
                                placeholder="0"
                                placeholderTextColor="#4b5563"
                                keyboardType="numeric"
                                value={ageMonths}
                                onChangeText={setAgeMonths}
                                style={styles.input}
                            />
                        </View>
                    </View>
                </View>

                {/* Medication Selection Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.numberBadge, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                            <Text style={[styles.numberText, { color: '#a855f7' }]}>2</Text>
                        </View>
                        <Text style={styles.cardTitle}>Medication</Text>
                    </View>

                    {/* Search Field */}
                    <Text style={styles.label}>Search Drug Database</Text>
                    <View style={styles.searchContainer}>
                        <View style={styles.searchInputWrapper}>
                            <Ionicons name="search" size={18} color="#4b5563" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search e.g. Panadol, Augmentin..."
                                placeholderTextColor="#4b5563"
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    if (text.length === 0) setShowResults(false);
                                }}
                                style={styles.searchInput}
                                onFocus={() => searchQuery.length > 1 && setShowResults(true)}
                            />
                            {isSearching && <ActivityIndicator size="small" color="#2dd4bf" style={{ marginRight: 10 }} />}
                        </View>

                        {showResults && searchResults.length > 0 && (
                            <View style={styles.resultsDropdown}>
                                {searchResults.map((item) => {
                                    const activeIng = Array.isArray(item.active_ingredients)
                                        ? item.active_ingredients.join(', ')
                                        : item.active_ingredients || '';
                                    const category = item.Category || '';

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleSelectDbDrug(item)}
                                            style={styles.resultItem}
                                        >
                                            <View style={styles.flex1}>
                                                <Text style={styles.resultName}>{item.trade_name}</Text>
                                                <Text style={styles.resultDetails} numberOfLines={1}>
                                                    {activeIng || category}
                                                </Text>
                                            </View>
                                            <Ionicons name="add-circle-outline" size={20} color="#2dd4bf" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Drug Selection */}
                    <Text style={styles.label}>Quick Select (Local)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {DRUG_DATABASE.map((drug) => (
                            <TouchableOpacity
                                key={drug.id}
                                onPress={() => setSelectedDrugId(drug.id)}
                                style={[styles.pillBtn, selectedDrugId === drug.id && styles.pillBtnActive]}
                            >
                                <Text style={[styles.pillText, selectedDrugId === drug.id && styles.pillTextActive]}>{drug.genericName}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Indication Selection */}
                    <Text style={styles.label}>Indication</Text>
                    <View style={styles.optionList}>
                        {selectedDrug.dosageRules.map((rule, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedIndicationIdx(idx)}
                                style={[styles.optionBtn, selectedIndicationIdx === idx && styles.optionBtnActive]}
                            >
                                <Text style={[styles.optionText, selectedIndicationIdx === idx && styles.optionTextActive]}>{rule.indication}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Formulation Selection */}
                    <Text style={styles.label}>Formulation</Text>
                    <View style={styles.optionList}>
                        {selectedDrug.formulations.map((form, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedFormulationIdx(idx)}
                                style={[styles.optionBtn, selectedFormulationIdx === idx && styles.optionBtnActive]}
                            >
                                <Text style={[styles.optionText, selectedFormulationIdx === idx && styles.optionTextActive]}>{form.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Result Card */}
                {result ? (
                    <View style={styles.resultCard}>
                        <View style={styles.resultAccent} />

                        <Text style={styles.resultLabel}>Recommended Dose</Text>
                        <Text style={styles.resultMeta}>
                            Based on {result.weightKg.toFixed(1)}kg • {result.ruleUsed.indication}
                        </Text>

                        <View style={styles.doseRow}>
                            <Text style={styles.doseValue}>{result.singleDoseMg % 1 === 0 ? result.singleDoseMg : result.singleDoseMg.toFixed(1)}</Text>
                            <Text style={styles.doseUnit}>mg</Text>
                        </View>

                        {result.singleDoseVolumeMl !== undefined && (
                            <View style={styles.volumeCard}>
                                <View>
                                    <Text style={styles.volumeLabel}>Volume (Liquid)</Text>
                                    <View style={styles.volumeRow}>
                                        <Text style={styles.volumeValue}>{result.singleDoseVolumeMl % 1 === 0 ? result.singleDoseVolumeMl : result.singleDoseVolumeMl.toFixed(1)}</Text>
                                        <Text style={styles.volumeUnit}>ml</Text>
                                    </View>
                                </View>
                                <View style={styles.concentrationBlock}>
                                    <Text style={styles.concLabel}>Conc</Text>
                                    <Text style={styles.concValue}>{result.formulation.label}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.frequencyRow}>
                            <View style={styles.freqIcon}>
                                <Ionicons name="time" size={20} color="#2dd4bf" />
                            </View>
                            <View>
                                <Text style={styles.freqLabel}>Frequency</Text>
                                <Text style={styles.freqValue}>{result.ruleUsed.frequencyLabel}</Text>
                            </View>
                        </View>

                        {result.warnings.length > 0 && (
                            <View style={styles.warningCard}>
                                <View style={styles.warningRow}>
                                    <Ionicons name="warning" size={18} color="#f97316" />
                                    <View style={styles.flex1}>
                                        {result.warnings.map((w, i) => (
                                            <Text key={i} style={styles.warningText}>{w}</Text>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="calculator-outline" size={48} color="#1a2e31" />
                        <Text style={styles.emptyText}>
                            Enter patient weight OR age to see dose
                        </Text>
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
                    <Text style={styles.disclaimerText}>
                        This tool is for support only. Verification against professional formularies is required. Not a substitute for medical advice.
                    </Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a1416',
        paddingTop: 60,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    headerSection: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        color: '#9ca3af',
    },
    card: {
        backgroundColor: '#101f22',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#1a2e31',
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    numberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    numberText: {
        fontWeight: 'bold',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    flex1: {
        flex: 1,
    },
    spacer: {
        width: 16,
    },
    label: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 4,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#0a1416',
        color: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a2e31',
        fontSize: 16,
    },
    inputWithUnit: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a1416',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a2e31',
        paddingHorizontal: 12,
    },
    inputFlex: {
        flex: 1,
        color: 'white',
        paddingVertical: 12,
        fontSize: 16,
    },
    unitToggle: {
        flexDirection: 'row',
        backgroundColor: '#1a2e31',
        padding: 4,
        borderRadius: 8,
    },
    unitBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    unitBtnActive: {
        backgroundColor: '#2dd4bf',
    },
    unitText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
    },
    unitTextActive: {
        color: 'white',
    },
    horizontalScroll: {
        marginBottom: 16,
    },
    pillBtn: {
        marginRight: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a2e31',
        backgroundColor: '#0a1416',
    },
    pillBtnActive: {
        backgroundColor: '#2dd4bf',
        borderColor: '#2dd4bf',
    },
    pillText: {
        fontWeight: 'bold',
        color: '#9ca3af',
    },
    pillTextActive: {
        color: 'white',
    },
    optionList: {
        gap: 8,
        marginBottom: 16,
    },
    optionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a2e31',
        backgroundColor: '#0a1416',
    },
    optionBtnActive: {
        backgroundColor: 'rgba(26, 46, 49, 0.6)',
        borderColor: '#2dd4bf',
    },
    optionText: {
        fontWeight: '500',
        color: '#9ca3af',
    },
    optionTextActive: {
        color: '#2dd4bf',
    },
    resultCard: {
        backgroundColor: '#101f22',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.3)',
        marginBottom: 32,
        overflow: 'hidden',
    },
    resultAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: '#2dd4bf',
    },
    resultLabel: {
        color: '#2dd4bf',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 4,
    },
    resultMeta: {
        color: '#6b7280',
        fontSize: 12,
        marginBottom: 16,
    },
    doseRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 16,
    },
    doseValue: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
    },
    doseUnit: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2dd4bf',
    },
    volumeCard: {
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    volumeLabel: {
        color: '#2dd4bf',
        fontWeight: 'bold',
        fontSize: 12,
    },
    volumeRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    volumeValue: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
    },
    volumeUnit: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2dd4bf',
    },
    concentrationBlock: {
        alignItems: 'flex-end',
    },
    concLabel: {
        color: '#6b7280',
        fontSize: 10,
        marginBottom: 4,
    },
    concValue: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    frequencyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#1a2e31',
    },
    freqIcon: {
        padding: 8,
        backgroundColor: 'rgba(45, 212, 191, 0.2)',
        borderRadius: 8,
    },
    freqLabel: {
        color: '#6b7280',
        fontSize: 10,
    },
    freqValue: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    warningCard: {
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
    },
    warningRow: {
        flexDirection: 'row',
        gap: 8,
    },
    warningText: {
        color: '#fb923c',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#1a2e31',
        borderRadius: 24,
        marginBottom: 32,
    },
    emptyText: {
        color: '#1a2e31',
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    disclaimer: {
        marginBottom: 32,
    },
    disclaimerTitle: {
        fontSize: 10,
        color: '#4b5563',
        textAlign: 'center',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    disclaimerText: {
        fontSize: 10,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 16,
        marginTop: 4,
    },
    // --- Search Styles ---
    searchContainer: {
        marginBottom: 16,
        zIndex: 10,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a1416',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1a2e31',
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        paddingVertical: 12,
        fontSize: 14,
    },
    resultsDropdown: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        backgroundColor: '#1a2e31',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2dd4bf',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 200,
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#0a1416',
    },
    resultName: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    resultDetails: {
        color: '#9ca3af',
        fontSize: 12,
    },
});
