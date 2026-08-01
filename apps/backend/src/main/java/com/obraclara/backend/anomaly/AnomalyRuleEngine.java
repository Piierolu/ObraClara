package com.obraclara.backend.anomaly;

import com.obraclara.backend.analysis.AnalysisResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Locale;

@Component
public class AnomalyRuleEngine {
    public record Finding(AnomalyType type, String severity, String message, String fieldNames) {}
    private record NamedValue(String name, BigDecimal value) {}

    public List<Finding> evaluate(List<AnalysisResult.FieldResult> extracted, List<AnalysisResult.EvidenceResult> evidence) {
        Map<String, NamedValue> values = new HashMap<>();
        for (var field : extracted) {
            try {
                values.put(field.name().toLowerCase(Locale.ROOT),
                        new NamedValue(field.name(), new BigDecimal(field.normalizedValue())));
            } catch (NumberFormatException | NullPointerException ignored) {
                // Non-numeric extracted fields are still available for lookup, but not arithmetic rules.
            }
        }
        List<Finding> findings = new ArrayList<>();
        compareDifferent(findings, first(values, "contract_rate"), first(values, "billed_rate", "unit_rate"),
                AnomalyType.RATE_MISMATCH, "Billed rate differs from the contract rate");
        compareGreater(findings, first(values, "billed_quantity", "quantity"),
                first(values, "certified_quantity", "progress_quantity", "approved_quantity"),
                AnomalyType.QUANTITY_EXCEEDS_PROGRESS, "Billed quantity exceeds approved progress");

        NamedValue contractRetention = first(values, "contract_retention_percent");
        NamedValue billedRetention = first(values, "billed_retention_percent", "retention_percent");
        if (billedRetention != null && (billedRetention.value().signum() < 0
                || billedRetention.value().compareTo(BigDecimal.TEN) > 0)) {
            findings.add(new Finding(AnomalyType.INVALID_RETENTION, "HIGH",
                    "Retention percent must be between 0 and 10", billedRetention.name()));
        } else if (contractRetention != null && billedRetention != null
                && contractRetention.value().compareTo(billedRetention.value()) != 0) {
            findings.add(new Finding(AnomalyType.INVALID_RETENTION, "HIGH",
                    "Billed retention differs from the contract retention",
                    contractRetention.name() + "," + billedRetention.name()));
        }
        NamedValue contract = first(values, "contract_limit", "contract_amount");
        NamedValue prior = first(values, "prior_payments");
        NamedValue current = first(values, "current_payment", "total", "total_amount");
        if (contract != null && current != null
                && value(prior).add(current.value()).compareTo(contract.value()) > 0) {
            findings.add(new Finding(AnomalyType.CONTRACT_BALANCE_EXCEEDED, "CRITICAL",
                    "Payment exceeds the remaining contract balance", names(contract, prior, current)));
        }
        NamedValue subtotal = first(values, "subtotal", "line_subtotal");
        NamedValue tax = first(values, "tax", "tax_amount");
        NamedValue retentionAmount = first(values, "retention_amount");
        NamedValue total = first(values, "total", "total_amount");
        if (subtotal != null && total != null) {
            BigDecimal expected = subtotal.value().add(value(tax)).subtract(value(retentionAmount));
            if (expected.subtract(total.value()).abs().compareTo(new BigDecimal("0.01")) > 0) {
                findings.add(new Finding(AnomalyType.ARITHMETIC_MISMATCH, "HIGH",
                        "Subtotal, tax and retention do not reconcile to total",
                        names(subtotal, tax, retentionAmount, total)));
            }
        }

        Set<String> evidenceQuotes = evidence.stream().map(AnalysisResult.EvidenceResult::quote)
                .filter(quote -> quote != null && !quote.isBlank()).collect(java.util.stream.Collectors.toSet());
        extracted.stream().filter(field -> field.quote() == null || field.quote().isBlank() || !evidenceQuotes.contains(field.quote()))
                .forEach(field -> findings.add(new Finding(AnomalyType.MISSING_EVIDENCE, "MEDIUM",
                        "Extracted field has no matching source evidence", field.name())));
        return findings;
    }

    private NamedValue first(Map<String, NamedValue> values, String... names) {
        for (String name : names) if (values.containsKey(name)) return values.get(name);
        return null;
    }

    private void compareDifferent(List<Finding> findings, NamedValue left, NamedValue right, AnomalyType type,
                                  String message) {
        if (left != null && right != null && left.value().compareTo(right.value()) != 0) {
            findings.add(new Finding(type, "HIGH", message, names(left, right)));
        }
    }

    private void compareGreater(List<Finding> findings, NamedValue left, NamedValue right, AnomalyType type,
                                String message) {
        if (left != null && right != null && left.value().compareTo(right.value()) > 0) {
            findings.add(new Finding(type, "HIGH", message, names(left, right)));
        }
    }

    private BigDecimal value(NamedValue value) {
        return value == null ? BigDecimal.ZERO : value.value();
    }

    private String names(NamedValue... values) {
        return java.util.Arrays.stream(values).filter(java.util.Objects::nonNull)
                .map(NamedValue::name).distinct().collect(java.util.stream.Collectors.joining(","));
    }
}
