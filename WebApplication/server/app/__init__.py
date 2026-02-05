__all__ = ["__version__"]

__version__ = "0.1.0"

# Export the FastAPI app for convenience so commands like `uvicorn app:app` work
try:
    from .main import app  # noqa
except Exception:
    # Import failures should not break package import; uvicorn will show helpful errors
    app = None  # type: ignore


