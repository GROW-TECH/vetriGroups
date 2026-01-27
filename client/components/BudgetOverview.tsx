import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withDelay 
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/context/DataContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BudgetOverview() {
  const { theme, isDark } = useTheme();
  const {
    clients,
    paymentStages,
    transactions,
    materialOrders,
    attendance,
    employees,
  } = useData() as any;
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const perClient = useMemo(() => {
    return (clients || []).map((c: any) => {
      const stages = (paymentStages || []).filter(
        (p: any) => p.clientId === c.id,
      );
      const totalDiscussed = stages.reduce(
        (s: number, p: any) => s + (p.amount || 0),
        0,
      );
      const totalReceivedFromStages = stages
        .filter((p: any) => p.isPaid)
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);

      const txReceived = (transactions || [])
        .filter((t: any) => t.clientId === c.id)
        .reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const income = txReceived || totalReceivedFromStages;

      const materialCost = (materialOrders || [])
        .filter((m: any) => m.clientId === c.id)
        .reduce((s: number, m: any) => s + (m.totalCost || 0), 0);

      const salaryCost = (attendance || [])
        .filter((a: any) => a.siteId === c.id && a.status === "present")
        .reduce((s: number, a: any) => {
          const emp = (employees || []).find((e: any) => e.id === a.employeeId);
          return s + (emp?.salary || 0);
        }, 0);

      const expense = materialCost + salaryCost;

      const nextMilestone = stages.find((p: any) => !p.isPaid) || null;

      const pending = totalDiscussed - income;

      return {
        id: c.id,
        name: c.projectName || c.name,
        totalDiscussed,
        income,
        expense,
        materialCost,
        salaryCost,
        nextMilestone,
        pending,
      };
    });
  }, [
    clients,
    paymentStages,
    transactions,
    materialOrders,
    attendance,
    employees,
  ]);

  const chartData = selectedClientId
    ? perClient.filter((d: any) => d.id === selectedClientId)
    : perClient;

  if (!clients || clients.length === 0) return null;

  const maxVal = Math.max(
    ...chartData.map((d: any) => Math.max(d.income, d.expense)),
    1,
  );

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v.toFixed(0)}`;
  };

  const selected = perClient.find((d: any) => d.id === selectedClientId) || null;

  const totalIncome = perClient.reduce((sum: number, d: any) => sum + d.income, 0);
  const totalExpense = perClient.reduce((sum: number, d: any) => sum + d.expense, 0);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
            <Feather name="bar-chart-2" size={20} color={Colors.light.primary} />
          </View>
          <View>
            <ThemedText type="body" style={styles.headerTitle}>
              Budget Overview
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
              Compare income vs expense per client
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        {/* Income Card */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1F2937' : '#ECFDF5' }]}>
          <View style={styles.summaryCardHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: '#10B981' }]}>
              <Feather name="trending-up" size={16} color="#fff" />
            </View>
            <ThemedText style={[styles.summaryLabel, { color: '#10B981' }]}>
              Total Income
            </ThemedText>
          </View>
          <ThemedText type="h3" style={[styles.summaryValue, { color: '#10B981' }]}>
            {formatCurrency(totalIncome)}
          </ThemedText>
        </View>

        {/* Expense Card */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1F2937' : '#FEF2F2' }]}>
          <View style={styles.summaryCardHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: '#EF4444' }]}>
              <Feather name="trending-down" size={16} color="#fff" />
            </View>
            <ThemedText style={[styles.summaryLabel, { color: '#EF4444' }]}>
              Total Expense
            </ThemedText>
          </View>
          <ThemedText type="h3" style={[styles.summaryValue, { color: '#EF4444' }]}>
            {formatCurrency(totalExpense)}
          </ThemedText>
        </View>
      </View>

      {/* Client Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.clientChips}
      >
        <Pressable
          style={[
            styles.chip,
            { 
              backgroundColor: selectedClientId === null 
                ? Colors.light.primary 
                : isDark ? '#374151' : '#F3F4F6' 
            }
          ]}
          onPress={() => setSelectedClientId(null)}
        >
          <ThemedText
            type="small"
            style={[
              styles.chipText,
              { 
                color: selectedClientId === null ? '#fff' : theme.text,
                fontWeight: selectedClientId === null ? '600' : '400'
              }
            ]}
          >
            All Clients
          </ThemedText>
        </Pressable>
        {clients.map((c: any) => (
          <Pressable
            key={c.id}
            style={[
              styles.chip,
              { 
                backgroundColor: selectedClientId === c.id 
                  ? Colors.light.primary 
                  : isDark ? '#374151' : '#F3F4F6' 
              }
            ]}
            onPress={() => setSelectedClientId(prev => prev === c.id ? null : c.id)}
          >
            <ThemedText
              type="small"
              style={[
                styles.chipText,
                { 
                  color: selectedClientId === c.id ? '#fff' : theme.text,
                  fontWeight: selectedClientId === c.id ? '600' : '400'
                }
              ]}
            >
              {c.projectName || c.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Chart Section */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <ThemedText style={styles.legendText}>Income</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <ThemedText style={styles.legendText}>Expense</ThemedText>
            </View>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.barsContainer}
        >
          {chartData.map((data: any, index: number) => (
            <BarGroup
              key={data.id}
              data={data}
              maxValue={maxVal}
              index={index}
              isDark={isDark}
              formatCurrency={formatCurrency}
            />
          ))}
        </ScrollView>
      </View>

      {/* Selected Client Details */}
      {selected && (
        <Animated.View 
          entering={FadeInDown.springify()}
          style={[
            styles.detailCard,
            { 
              backgroundColor: isDark ? '#1F2937' : '#fff',
              borderColor: isDark ? '#374151' : '#E5E7EB'
            }
          ]}
        >
          <View style={styles.detailHeader}>
            <Feather name="info" size={18} color={Colors.light.primary} />
            <ThemedText style={styles.detailHeaderText}>
              {selected.name} - Details
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Feather name="dollar-sign" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={styles.detailLabel}>
                Total Discussed
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.detailValue}>
              {formatCurrency(selected.totalDiscussed)}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Feather name="trending-up" size={14} color="#10B981" />
              <ThemedText type="small" style={styles.detailLabel}>
                Total Received
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.detailValue, { color: '#10B981' }]}>
              {formatCurrency(selected.income)}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Feather name="trending-down" size={14} color="#EF4444" />
              <ThemedText type="small" style={styles.detailLabel}>
                Total Expenses
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.detailValue, { color: '#EF4444' }]}>
              {formatCurrency(selected.expense)}
            </ThemedText>
          </View>

          <View style={[styles.detailRow, { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <View style={styles.detailLabelContainer}>
              <Feather name="flag" size={14} color="#F59E0B" />
              <ThemedText type="small" style={styles.detailLabel}>
                Next Milestone
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
              {selected.nextMilestone
                ? `${selected.nextMilestone.name} — ${formatCurrency(selected.nextMilestone.amount)}`
                : "All paid ✓"}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Feather name="clock" size={14} color="#F59E0B" />
              <ThemedText type="small" style={styles.detailLabel}>
                Pending Amount
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={[
                styles.detailValue,
                { 
                  color: selected.pending > 0 ? '#F59E0B' : '#10B981',
                  fontWeight: '700'
                }
              ]}
            >
              {formatCurrency(selected.pending)}
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </ThemedView>
  );
}

interface BarGroupProps {
  data: any;
  maxValue: number;
  index: number;
  isDark: boolean;
  formatCurrency: (v: number) => string;
}

function BarGroup({ data, maxValue, index, isDark, formatCurrency }: BarGroupProps) {
  const incomeHeight = (data.income / maxValue) * 120;
  const expenseHeight = (data.expense / maxValue) * 120;

  const incomeScale = useSharedValue(0);
  const expenseScale = useSharedValue(0);

  React.useEffect(() => {
    incomeScale.value = withDelay(index * 100, withSpring(1, { damping: 15, stiffness: 100 }));
    expenseScale.value = withDelay(index * 100 + 50, withSpring(1, { damping: 15, stiffness: 100 }));
  }, []);

  const incomeAnimatedStyle = useAnimatedStyle(() => ({
    height: Math.max(4, incomeHeight * incomeScale.value),
  }));

  const expenseAnimatedStyle = useAnimatedStyle(() => ({
    height: Math.max(4, expenseHeight * expenseScale.value),
  }));

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 80).springify()}
      style={styles.barGroup}
    >
      {/* Values on top */}
      <View style={styles.barValues}>
        {data.income > 0 && (
          <ThemedText style={[styles.barValueText, { color: '#10B981' }]}>
            {formatCurrency(data.income)}
          </ThemedText>
        )}
        {data.expense > 0 && (
          <ThemedText style={[styles.barValueText, { color: '#EF4444' }]}>
            {formatCurrency(data.expense)}
          </ThemedText>
        )}
      </View>

      {/* Bars */}
      <View style={styles.barsWrapper}>
        {/* Income Bar */}
        <View style={styles.barContainer}>
          <Animated.View style={[styles.bar, incomeAnimatedStyle]}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.barGradient}
            />
          </Animated.View>
        </View>
        
        {/* Expense Bar */}
        <View style={styles.barContainer}>
          <Animated.View style={[styles.bar, expenseAnimatedStyle]}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.barGradient}
            />
          </Animated.View>
        </View>
      </View>

      {/* Client Name Label */}
      <ThemedText style={styles.clientLabel} numberOfLines={2}>
        {data.name.length > 10 ? data.name.slice(0, 10) + '...' : data.name}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  clientChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: 13,
  },
  chartContainer: {
    marginBottom: Spacing.md,
  },
  chartHeader: {
    marginBottom: Spacing.md,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  barGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 70,
  },
  barValues: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    minHeight: 20,
    alignItems: 'center',
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '700',
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 120,
  },
  barContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barGradient: {
    width: '100%',
    height: '100%',
  },
  clientLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: Spacing.xs,
    textAlign: 'center',
    width: 60,
  },
  detailCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  detailValue: {
    fontWeight: '700',
    fontSize: 13,
  },
});