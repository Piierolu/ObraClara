from __future__ import annotations

from collections import OrderedDict
from threading import Lock

from .domain import ProcessedDocument
from .extractor import process_content


class DocumentProcessor:
    def __init__(self, cache_size: int = 256) -> None:
        if cache_size < 1:
            raise ValueError("cache_size must be positive")
        self._cache_size = cache_size
        self._cache: OrderedDict[str, ProcessedDocument] = OrderedDict()
        self._lock = Lock()

    @property
    def cache_entries(self) -> int:
        with self._lock:
            return len(self._cache)

    def process(
        self,
        *,
        content: bytes,
        file_name: str,
        organization_id: str = "",
        idempotency_key: str = "",
    ) -> ProcessedDocument:
        cache_key = f"{organization_id}\0{idempotency_key}" if idempotency_key else ""
        if cache_key:
            with self._lock:
                cached = self._cache.get(cache_key)
                if cached is not None:
                    self._cache.move_to_end(cache_key)
                    return cached

        result = process_content(content, file_name)
        if cache_key:
            with self._lock:
                existing = self._cache.get(cache_key)
                if existing is not None:
                    self._cache.move_to_end(cache_key)
                    return existing
                self._cache[cache_key] = result
                while len(self._cache) > self._cache_size:
                    self._cache.popitem(last=False)
        return result
