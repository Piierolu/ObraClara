from obra_ai.processor import DocumentProcessor


def test_idempotency_cache_is_bounded_and_namespaced():
    processor = DocumentProcessor(cache_size=2)
    first = processor.process(
        content=b"Invoice number: FIRST",
        file_name="one.txt",
        organization_id="org-a",
        idempotency_key="key",
    )
    cached = processor.process(
        content=b"Delivery note",
        file_name="two.txt",
        organization_id="org-a",
        idempotency_key="key",
    )
    other_org = processor.process(
        content=b"Delivery note",
        file_name="two.txt",
        organization_id="org-b",
        idempotency_key="key",
    )
    processor.process(content=b"Change order", file_name="three.txt", idempotency_key="third")

    assert cached is first
    assert other_org.document_type == "DELIVERY_NOTE"
    assert processor.cache_entries == 2
