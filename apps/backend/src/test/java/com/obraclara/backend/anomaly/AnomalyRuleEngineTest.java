package com.obraclara.backend.anomaly;

import com.obraclara.backend.analysis.AnalysisResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class AnomalyRuleEngineTest {
    private final AnomalyRuleEngine engine = new AnomalyRuleEngine();

    @Test
    void detectsAllFinancialRuleTypesAndMissingEvidence() {
        var fields = List.of(
                field("contract_amount", "1000", "contract_amount: 1000"),
                field("contract_rate", "10", "contract_rate: 10"),
                field("billed_rate", "12", "billed_rate: 12"),
                field("billed_quantity", "20", "billed_quantity: 20"),
                field("progress_quantity", "15", "progress_quantity: 15"),
                field("retention_percent", "12", "retention_percent: 12"),
                field("prior_payments", "900", "prior_payments: 900"),
                field("current_payment", "200", "current_payment: 200"),
                field("subtotal", "100", "subtotal: 100"),
                field("tax_amount", "16", "tax_amount: 16"),
                field("retention_amount", "5", "retention_amount: 5"),
                field("total_amount", "120", "total_amount: 120")
        );
        var evidence = fields.subList(0, fields.size() - 1).stream()
                .map(field -> new AnalysisResult.EvidenceResult(field.name(), 1, field.quote(), ""))
                .toList();

        Set<AnomalyType> types = engine.evaluate(fields, evidence).stream()
                .map(AnomalyRuleEngine.Finding::type).collect(Collectors.toSet());

        assertThat(types).containsExactlyInAnyOrder(
                AnomalyType.RATE_MISMATCH,
                AnomalyType.QUANTITY_EXCEEDS_PROGRESS,
                AnomalyType.INVALID_RETENTION,
                AnomalyType.CONTRACT_BALANCE_EXCEEDED,
                AnomalyType.ARITHMETIC_MISMATCH,
                AnomalyType.MISSING_EVIDENCE);
    }

    @Test
    void supportsPythonFieldNamesAndRetentionPair() {
        var fields = List.of(
                field("contract_limit", "1000", "contract_limit: 1000"),
                field("contract_rate", "8", "contract_rate: 8"),
                field("unit_rate", "10", "unit_rate: 10"),
                field("quantity", "12", "quantity: 12"),
                field("certified_quantity", "10", "certified_quantity: 10"),
                field("contract_retention_percent", "5", "contract_retention_percent: 5"),
                field("billed_retention_percent", "7", "billed_retention_percent: 7"),
                field("subtotal", "1100", "subtotal: 1100"),
                field("tax", "100", "tax: 100"),
                field("total", "1200", "total: 1200")
        );
        var evidence = fields.stream().map(field ->
                new AnalysisResult.EvidenceResult(field.name(), 1, field.quote(), "")).toList();

        assertThat(engine.evaluate(fields, evidence).stream().map(AnomalyRuleEngine.Finding::type))
                .contains(AnomalyType.RATE_MISMATCH, AnomalyType.QUANTITY_EXCEEDS_PROGRESS,
                        AnomalyType.INVALID_RETENTION, AnomalyType.CONTRACT_BALANCE_EXCEEDED);
    }

    private AnalysisResult.FieldResult field(String name, String value, String quote) {
        return new AnalysisResult.FieldResult(name, value, value, 0.9, 1, quote);
    }
}
