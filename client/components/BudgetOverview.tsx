import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";
import Svg, {
  Rect,
  G,
  Text as SvgText,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { Feather } from "@expo/vector-icons";

// removed duplicate imports (kept consolidated imports below)
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/context/DataContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BudgetOverview() {
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

  const chartData = perClient;
  if (!clients || clients.length === 0) return null;

  const chartWidth = Math.max(360, SCREEN_WIDTH - 48);
  const chartHeight = 220;
  const padding = { top: 20, right: 12, bottom: 60, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...chartData.map((d: any) => Math.max(d.income, d.expense)),
    1,
  );
  const groupWidth = innerWidth / Math.max(1, chartData.length);
  const barWidth = Math.min(28, groupWidth * 0.36);

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxVal / ticks) * i),
  );

  const formatCurrency = (v: number) => "₹" + v.toLocaleString("en-IN");

  const selected =
    chartData.find((d: any) => d.id === selectedClientId) || null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="body" style={styles.title}>
          Budget Overview
        </ThemedText>
        <ThemedText type="small" style={styles.subtitle}>
          Compare income vs expense per client
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.clientChips}
      >
        <Pressable
          style={[styles.chip, selectedClientId === null && styles.chipActive]}
          onPress={() => setSelectedClientId(null)}
        >
          <ThemedText
            type="small"
            style={
              selectedClientId === null
                ? styles.chipTextActive
                : styles.chipText
            }
          >
            All
          </ThemedText>
        </Pressable>
        {clients.map((c: any) => (
          <Pressable
            key={c.id}
            style={[
              styles.chip,
              selectedClientId === c.id && styles.chipActive,
            ]}
            onPress={() =>
              setSelectedClientId((prev) => (prev === c.id ? null : c.id))
            }
          >
            <ThemedText
              type="small"
              style={
                selectedClientId === c.id
                  ? styles.chipTextActive
                  : styles.chipText
              }
            >
              {c.projectName || c.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#34D399" stopOpacity="1" />
              <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
            </SvgLinearGradient>
            <SvgLinearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FCA5A5" stopOpacity="1" />
              <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {tickValues.map((tv, idx) => {
            const y = padding.top + innerHeight - (tv / maxVal) * innerHeight;
            return (
              <G key={idx}>
                <Line
                  x1={padding.left}
                  x2={padding.left + innerWidth}
                  y1={y}
                  y2={y}
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth={1}
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize={10}
                  fill="#6B7280"
                  textAnchor="end"
                >
                  {formatCurrency(tv)}
                </SvgText>
              </G>
            );
          })}

          {chartData.map((d: any, i: number) => {
            if (selectedClientId && d.id !== selectedClientId) return null;
            const index = selectedClientId ? 0 : i;
            const groupX = padding.left + index * groupWidth + groupWidth / 2;
            const incomeH = (d.income / maxVal) * innerHeight;
            const expenseH = (d.expense / maxVal) * innerHeight;
            const incomeY = padding.top + innerHeight - incomeH;
            const expenseY = padding.top + innerHeight - expenseH;

            return (
              <G key={d.id}>
                <Rect
                  x={groupX - barWidth - 6}
                  y={incomeY}
                  width={barWidth}
                  height={incomeH}
                  rx={6}
                  fill="url(#inc)"
                />
                <Rect
                  x={groupX + 6}
                  y={expenseY}
                  width={barWidth}
                  height={expenseH}
                  rx={6}
                  fill="url(#exp)"
                />

                {d.income > 0 && (
                  <SvgText
                    x={groupX - barWidth - 6 + barWidth / 2}
                    y={incomeY - 6}
                    fontSize={10}
                    fill="#065f46"
                    textAnchor="middle"
                  >
                    {formatCurrency(d.income)}
                  </SvgText>
                )}
                {d.expense > 0 && (
                  <SvgText
                    x={groupX + 6 + barWidth / 2}
                    y={expenseY - 6}
                    fontSize={10}
                    fill="#7f1d1d"
                    textAnchor="middle"
                  >
                    {formatCurrency(d.expense)}
                  </SvgText>
                )}

                <SvgText
                  x={groupX}
                  y={padding.top + innerHeight + 18}
                  fontSize={11}
                  fill="#374151"
                  textAnchor="middle"
                >
                  {String(d.name).length > 12
                    ? String(d.name).slice(0, 12) + "..."
                    : d.name}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: "#10B981" }]} />
          <ThemedText type="small">Income</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: "#EF4444" }]} />
          <ThemedText type="small">Expense</ThemedText>
        </View>
      </View>

      {selected && (
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={styles.detailLabel}>
              Total Discussed
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              {formatCurrency(selected.totalDiscussed)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={styles.detailLabel}>
              Total Received
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.detailValue, { color: "#10B981" }]}
            >
              {formatCurrency(selected.income)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={styles.detailLabel}>
              Total Expenses
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.detailValue, { color: "#DC2626" }]}
            >
              {formatCurrency(selected.expense)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={styles.detailLabel}>
              Next Milestone
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              {selected.nextMilestone
                ? `${selected.nextMilestone.name} — ${formatCurrency(selected.nextMilestone.amount)}`
                : "All paid"}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={styles.detailLabel}>
              Pending Amount
            </ThemedText>
            <ThemedText
              type="small"
              style={[
                styles.detailValue,
                { color: selected.pending > 0 ? "#D97706" : "#059669" },
              ]}
            >
              {formatCurrency(selected.pending)}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg, paddingHorizontal: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontWeight: "700", fontSize: 16 },
  subtitle: { color: "#6B7280", fontSize: 12 },
  clientChips: { paddingVertical: 8, paddingLeft: 4, gap: Spacing.sm },
  chip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#3B82F6" },
  chipText: { color: "#374151" },
  chipTextActive: { color: "#fff" },
  legendRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  detailCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: { color: "#6B7280" },
  detailValue: { fontWeight: "700" },
});
