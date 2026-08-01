import pytest
from pathlib import Path

from obra_ai.extractor import DocumentExtractionError, process_content


@pytest.mark.parametrize(
    ("heading", "expected"),
    [
        ("Contract number: CT-1", "CONTRACT"),
        ("Change order 7", "CHANGE_ORDER"),
        ("Progress certificate 3", "PROGRESS_CERTIFICATE"),
        ("Invoice number: I-3", "INVOICE"),
        ("Delivery note", "DELIVERY_NOTE"),
        ("Contrato de ejecución", "CONTRACT"),
        ("Factura de obra", "INVOICE"),
        ("Certificación de avance", "PROGRESS_CERTIFICATE"),
        ("Orden de cambio", "CHANGE_ORDER"),
        ("Albarán de materiales", "DELIVERY_NOTE"),
    ],
)
def test_classifies_supported_documents(heading, expected):
    result = process_content(heading.encode(), "fixture.txt")
    assert result.document_type == expected


def test_extracts_normalizes_quotes_pages_and_masks_pii():
    text = (
        "TAX INVOICE\n"
        "Invoice number: INV-42\n"
        "Unit rate: $1,250.50\n"
        "Quantity: 4\n"
        "Contact: site.manager@example.com\f"
        "Subtotal: 5.002,00\nTax: 1.050,42\nTotal: 6.052,42"
    )
    result = process_content(text.encode(), "fixture.txt")
    fields = {field.name: field for field in result.fields}

    assert fields["unit_rate"].normalized_value == "1250.5"
    assert fields["total"].normalized_value == "6052.42"
    assert fields["total"].page == 2
    assert fields["total"].quote == "Total: 6.052,42"
    assert result.pages[1].number == 2
    assert result.evidences[-1].quote in result.pages[1].text
    assert result.pii_findings[0].type == "EMAIL"
    assert "site.manager" not in result.pii_findings[0].masked_value


def test_rejects_non_utf8_fixture():
    with pytest.raises(DocumentExtractionError, match="UTF-8"):
        process_content(b"\xff\xfe", "fixture.bin")


def test_extracts_spanish_invoice_for_java_anomaly_fields():
    fixture = Path(__file__).parent / "fixtures" / "factura_obra_es.txt"
    result = process_content(fixture.read_bytes(), fixture.name)
    fields = {field.name: field for field in result.fields}

    assert result.document_type == "INVOICE"
    assert {name: field.normalized_value for name, field in fields.items()} == {
        "invoice_number": "FAC-2026-017",
        "contract_number": "OC-MAD-042",
        "contract_rate": "125.5",
        "billed_rate": "132",
        "billed_quantity": "80",
        "progress_quantity": "75",
        "contract_retention_percent": "5",
        "billed_retention_percent": "7",
        "contract_amount": "250000",
        "prior_payments": "180000",
        "current_payment": "10000",
        "subtotal": "10560",
        "tax_amount": "2217.6",
        "retention_amount": "739.2",
        "total_amount": "12038.4",
        "approved_change_amount": "1500",
    }
    assert fields["total_amount"].page == 2
    assert fields["total_amount"].quote == "Importe total: 12.038,40 EUR"
    evidence = {item.evidence_id: item for item in result.evidences}
    assert evidence["field-total_amount-2"].quote == fields["total_amount"].quote
    assert fields["total_amount"].quote in result.pages[1].text


def test_specific_labels_are_not_duplicated_as_generic_fields():
    result = process_content(
        (
            "Invoice\nBilled quantity: 20\nCertified quantity: 18\n"
            "Billed retention percent: 6%\nTax amount: 21\nTotal amount: 121"
        ).encode(),
        "specific-labels.txt",
    )
    names = {field.name for field in result.fields}

    assert {"billed_quantity", "certified_quantity", "billed_retention_percent", "tax_amount", "total_amount"} <= names
    assert not {"quantity", "retention_percent", "tax", "total"} & names
