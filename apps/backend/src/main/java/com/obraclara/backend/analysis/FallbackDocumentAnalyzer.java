package com.obraclara.backend.analysis;

import com.obraclara.backend.document.Document;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class FallbackDocumentAnalyzer {
    private static final Pattern FIELD = Pattern.compile("(?im)^\\s*([a-z][a-z0-9_ .-]{1,60})\\s*[:=]\\s*([^\\r\\n]+)");
    private static final Set<String> FIXTURE_FIELDS = Set.of(
            "contract_amount", "contract_limit", "contract_rate", "unit_rate", "billed_rate", "billed_quantity",
            "quantity", "certified_quantity", "progress_quantity", "approved_quantity", "retention_percent",
            "contract_retention_percent", "billed_retention_percent", "retention_amount", "prior_payments",
            "current_payment", "subtotal", "line_subtotal", "tax", "tax_amount", "total", "total_amount");

    AnalysisResult analyze(Document document, byte[] content) {
        String text = new String(content, StandardCharsets.UTF_8);
        Matcher matcher = FIELD.matcher(text);
        List<AnalysisResult.FieldResult> fields = new ArrayList<>();
        List<AnalysisResult.EvidenceResult> evidences = new ArrayList<>();
        while (matcher.find()) {
            String name = normalizeName(matcher.group(1));
            if (!FIXTURE_FIELDS.contains(name)) {
                continue;
            }
            String value = matcher.group(2).trim();
            String quote = matcher.group().trim();
            fields.add(new AnalysisResult.FieldResult(name, value, normalizeNumber(value), 0.90, 1, quote));
            evidences.add(new AnalysisResult.EvidenceResult("fallback-" + fields.size(), 1, quote, ""));
        }
        return new AnalysisResult("PAYMENT_APPLICATION", "IN_PROCESS_FALLBACK", fields, evidences);
    }

    private String normalizeName(String value) {
        return value.strip().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
    }

    private String normalizeNumber(String value) {
        String normalized = value.replaceAll("[^0-9,.\\-]", "");
        if (normalized.contains(",") && normalized.contains(".")) {
            normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
                    ? normalized.replace(".", "").replace(',', '.') : normalized.replace(",", "");
        } else if (normalized.contains(",")) {
            normalized = normalized.replace(',', '.');
        }
        return normalized.isBlank() || normalized.equals("-") ? value.trim() : normalized;
    }
}
