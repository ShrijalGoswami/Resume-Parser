from abc import ABC, abstractmethod
from pathlib import Path

class BaseParser(ABC):
    """
    Abstract interface for resume document parsers.
    """
    @abstractmethod
    def parse(self, file_path: Path) -> tuple[str, int]:
        """
        Extract text content and page count from the given file.

        Args:
            file_path: The filesystem Path to the document.

        Returns:
            A tuple of (extracted_text, page_count).

        Raises:
            ParserError: If parsing fails.
        """
        pass
