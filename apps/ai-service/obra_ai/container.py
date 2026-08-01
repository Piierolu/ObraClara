from .config import Settings
from .processor import DocumentProcessor

settings = Settings.from_env()
processor = DocumentProcessor(cache_size=settings.cache_size)
