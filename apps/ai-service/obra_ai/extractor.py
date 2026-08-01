from __future__ import annotations

import io
import re
import unicodedata
from decimal import Decimal, InvalidOperation

from pypdf import PdfReader

from .domain import Evidence, ExtractedField, Page, PiiFinding, ProcessedDocument


class DocumentExtractionError(ValueError):
    pass


_DOCUMENT_TERMS: dict[str, tuple[str, ...]] = {
    "CHANGE_ORDER": (
        "change order",
        "variation order",
        "approved change amount",
        "orden de cambio",
        "orden de variacion",
    ),
    "PROGRESS_CERTIFICATE": (
        "progress certificate",
        "payment certificate",
        "certified quantity",
        "certificacion de avance",
        "certificado de avance",
    ),
    "INVOICE": ("invoice number", "invoice no", "tax invoice", "invoice", "factura"),
    "DELIVERY_NOTE": (
        "delivery note",
        "goods received note",
        "packing slip",
        "albaran",
        "nota de entrega",
    ),
    "CONTRACT": ("contract number", "agreement number", "contract limit", "contract", "contrato"),
}

# Specific labels must precede their generic aliases. Only the first matching label
# on a line is extracted, mirroring the one-field-per-line Java fallback fixtures.
_FIELD_LABELS: tuple[tuple[str, str, bool], ...] = (
    (
        "contract_number",
        r"(?:contract|agreement)[\s_-]*(?:number|no\.?|#)|"
        r"(?:n[uú]mero|n[.º°o]+)[\s_-]*(?:de[\s_-]*)?(?:contrato|acuerdo)|"
        r"(?:contrato|acuerdo)[\s_-]*(?:n[uú]mero|n[.º°o]+)",
        False,
    ),
    (
        "invoice_number",
        r"invoice[\s_-]*(?:number|no\.?|#)|"
        r"(?:n[uú]mero|n[.º°o]+)[\s_-]*(?:de[\s_-]*)?factura|"
        r"factura[\s_-]*(?:n[uú]mero|n[.º°o]+)",
        False,
    ),
    (
        "contract_rate",
        r"contract[\s_-]*rate|tarifa[\s_-]*(?:contractual|de(?:l)?[\s_-]*contrato)|"
        r"precio[\s_-]*unitario[\s_-]*(?:contractual|de(?:l)?[\s_-]*contrato)",
        True,
    ),
    (
        "billed_rate",
        r"(?:billed|invoiced)[\s_-]*rate|tarifa[\s_-]*facturada|precio[\s_-]*unitario[\s_-]*facturado",
        True,
    ),
    (
        "billed_quantity",
        r"(?:billed|invoiced)[\s_-]*quantity|cantidad[\s_-]*facturada",
        True,
    ),
    (
        "certified_quantity",
        r"certified[\s_-]*quantity|cantidad[\s_-]*certificada",
        True,
    ),
    (
        "progress_quantity",
        r"progress[\s_-]*quantity|approved[\s_-]*quantity|"
        r"cantidad[\s_-]*(?:de[\s_-]*)?(?:avance|progreso|aprobada)",
        True,
    ),
    (
        "contract_retention_percent",
        r"contract[\s_-]*retention[\s_-]*(?:percent|percentage|%)|"
        r"porcentaje[\s_-]*(?:de[\s_-]*)?retenci[oó]n[\s_-]*(?:contractual|de(?:l)?[\s_-]*contrato)",
        True,
    ),
    (
        "billed_retention_percent",
        r"billed[\s_-]*retention[\s_-]*(?:percent|percentage|%)|"
        r"porcentaje[\s_-]*(?:de[\s_-]*)?retenci[oó]n[\s_-]*(?:facturado|facturada|aplicado|aplicada)",
        True,
    ),
    (
        "contract_limit",
        r"contract[\s_-]*limit|l[ií]mite[\s_-]*(?:de(?:l)?[\s_-]*)?contrato|l[ií]mite[\s_-]*contractual",
        True,
    ),
    (
        "contract_amount",
        r"contract[\s_-]*amount|(?:monto|importe|valor)[\s_-]*(?:de(?:l)?[\s_-]*)?contrato",
        True,
    ),
    (
        "prior_payments",
        r"prior[\s_-]*payments?|previous[\s_-]*payments?|pagos?[\s_-]*(?:anteriores?|previos?)",
        True,
    ),
    (
        "current_payment",
        r"current[\s_-]*payment|pago[\s_-]*(?:actual|corriente)|importe[\s_-]*(?:actual|de[\s_-]*esta[\s_-]*certificaci[oó]n)",
        True,
    ),
    (
        "tax_amount",
        r"tax[\s_-]*amount|importe[\s_-]*(?:de(?:l)?[\s_-]*)?(?:impuesto|iva)|"
        r"monto[\s_-]*(?:de(?:l)?[\s_-]*)?impuesto",
        True,
    ),
    (
        "retention_amount",
        r"retention[\s_-]*amount|(?:importe|monto)[\s_-]*(?:de[\s_-]*)?retenci[oó]n",
        True,
    ),
    (
        "total_amount",
        r"total[\s_-]*amount|(?:importe|monto)[\s_-]*total",
        True,
    ),
    (
        "approved_change_amount",
        r"approved[\s_-]*change[\s_-]*amount|"
        r"(?:importe|monto)[\s_-]*aprobado[\s_-]*(?:de(?:l)?[\s_-]*)?(?:la[\s_-]*)?orden[\s_-]*de[\s_-]*cambio|"
        r"(?:importe|monto)[\s_-]*(?:de(?:l)?[\s_-]*)?(?:la[\s_-]*)?orden[\s_-]*de[\s_-]*cambio[\s_-]*aprobada?",
        True,
    ),
    ("unit_rate", r"unit[\s_-]*rate|tarifa[\s_-]*unitaria|precio[\s_-]*unitario", True),
    ("quantity", r"quantity|cantidad", True),
    (
        "retention_percent",
        r"retention[\s_-]*(?:percent|percentage|%)|"
        r"porcentaje[\s_-]*(?:de[\s_-]*)?retenci[oó]n|retenci[oó]n[\s_-]*%",
        True,
    ),
    ("subtotal", r"sub[\s_-]*total", True),
    ("tax", r"tax|impuesto|iva", True),
    ("total", r"total", True),
)

_PII_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("EMAIL", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)),
    ("NATIONAL_ID", re.compile(r"\b(?:\d{8}[A-Z]|\d{3}-\d{2}-\d{4})\b", re.IGNORECASE)),
    (
        "PHONE",
        re.compile(r"(?<![\w.])(?:\+\d{1,3}[ .-]?)?(?:\d[ .-]?){9,12}(?![\w.])"),
    ),
)


def extract_pages(content: bytes, file_name: str) -> tuple[Page, ...]:
    if not content:
        raise DocumentExtractionError("document content is empty")

    if content.startswith(b"%PDF") or file_name.lower().endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            pages = tuple(
                Page(number=index, text=page.extract_text() or "")
                for index, page in enumerate(reader.pages, start=1)
            )
        except Exception as exc:
            raise DocumentExtractionError("content is not a readable textual PDF") from exc
        if not pages or not any(page.text.strip() for page in pages):
            raise DocumentExtractionError("PDF contains no embedded text")
        return pages

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise DocumentExtractionError("fixture content must be UTF-8") from exc
    return tuple(
        Page(number=index, text=page_text)
        for index, page_text in enumerate(text.split("\f"), start=1)
    )


def classify(pages: tuple[Page, ...]) -> str:
    text = unicodedata.normalize("NFKD", "\n".join(page.text for page in pages).casefold())
    text = "".join(character for character in text if not unicodedata.combining(character))
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    scores = {
        document_type: sum(1 for term in terms if term in text)
        + 2 * any(term in first_line for term in terms)
        for document_type, terms in _DOCUMENT_TERMS.items()
    }
    document_type, score = max(scores.items(), key=lambda item: item[1])
    return document_type if score else "UNKNOWN"


def _normalize_number(raw_value: str) -> str:
    value = re.sub(r"[^0-9,.-]", "", raw_value)
    if not value or value in {"-", ".", ","}:
        return raw_value.strip()

    if "," in value and "." in value:
        decimal_separator = "," if value.rfind(",") > value.rfind(".") else "."
        thousands_separator = "." if decimal_separator == "," else ","
        value = value.replace(thousands_separator, "").replace(decimal_separator, ".")
    elif "," in value:
        parts = value.split(",")
        value = "".join(parts) if len(parts[-1]) == 3 else ".".join(parts)
    elif "." in value:
        parts = value.split(".")
        value = "".join(parts) if len(parts[-1]) == 3 else ".".join(parts)

    try:
        normalized = format(Decimal(value), "f")
    except InvalidOperation:
        return raw_value.strip()
    return normalized.rstrip("0").rstrip(".") if "." in normalized else normalized


def _field_pattern(label: str, numeric: bool) -> re.Pattern[str]:
    if numeric:
        value = (
            r"(?P<value>[-+]?\s*(?:(?:USD|EUR|GBP)\s*|[$€£]\s*)?"
            r"\d[\d., ]*(?:\s*(?:USD|EUR|GBP|[$€£]|%))?)"
        )
    else:
        value = r"(?P<value>[A-Z0-9][A-Z0-9./_-]*)"
    return re.compile(rf"\b(?:{label})\s*[:=-]?\s*{value}", re.IGNORECASE)


_FIELD_PATTERNS = tuple(
    (name, _field_pattern(label, numeric), numeric)
    for name, label, numeric in _FIELD_LABELS
)


def extract_fields(pages: tuple[Page, ...]) -> tuple[ExtractedField, ...]:
    found: dict[str, ExtractedField] = {}
    for page in pages:
        for line in page.text.splitlines():
            quote = line.strip()
            if not quote:
                continue
            for name, pattern, numeric in _FIELD_PATTERNS:
                match = pattern.search(line)
                if not match:
                    continue
                if name not in found:
                    raw_value = match.group("value").strip()
                    found[name] = ExtractedField(
                        name=name,
                        raw_value=raw_value,
                        normalized_value=_normalize_number(raw_value) if numeric else raw_value,
                        confidence=0.95,
                        page=page.number,
                        quote=quote,
                    )
                break
    return tuple(found.values())


def _mask(value: str) -> str:
    if "@" in value:
        local, domain = value.split("@", 1)
        return f"{local[:1]}***@{domain}"
    alphanumeric = [index for index, char in enumerate(value) if char.isalnum()]
    visible = set(alphanumeric[-2:])
    return "".join(char if index in visible or not char.isalnum() else "*" for index, char in enumerate(value))


def find_pii(pages: tuple[Page, ...]) -> tuple[PiiFinding, ...]:
    findings: list[PiiFinding] = []
    for page in pages:
        matches: list[tuple[int, str, str]] = []
        for pii_type, pattern in _PII_PATTERNS:
            matches.extend((match.start(), pii_type, match.group()) for match in pattern.finditer(page.text))
        for _, pii_type, value in sorted(matches):
            findings.append(PiiFinding(type=pii_type, page=page.number, masked_value=_mask(value)))
    return tuple(findings)


def process_content(content: bytes, file_name: str) -> ProcessedDocument:
    pages = extract_pages(content, file_name)
    fields = extract_fields(pages)
    evidences = tuple(
        Evidence(evidence_id=f"field-{field.name}-{field.page}", page=field.page, quote=field.quote)
        for field in fields
    )
    return ProcessedDocument(
        document_type=classify(pages),
        pages=pages,
        fields=fields,
        evidences=evidences,
        pii_findings=find_pii(pages),
    )
