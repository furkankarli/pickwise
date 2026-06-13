class PickwiseError(Exception):
    """Safe application error that can be shown to the client."""

    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.message = message
        self.retryable = retryable


class ConfigurationError(PickwiseError):
    """Raised when required demo configuration is missing."""


class ExternalToolError(PickwiseError):
    """Raised when a provider call fails in a recoverable way."""

