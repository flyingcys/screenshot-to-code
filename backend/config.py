import os

# Keep a single variant per request so the same prompt is not generated multiple
# times in parallel, which would waste tokens for near-duplicate results.
NUM_VARIANTS = 1
NUM_VARIANTS_VIDEO = 1


def get_variant_count(generation_type: str, input_mode: str) -> int:
    """Return the shared variant count policy for every generation flow."""
    if input_mode == "video":
        return NUM_VARIANTS_VIDEO

    return NUM_VARIANTS

# LLM-related
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", None)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", None)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", None)

# Image generation (optional)
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY", None)

# Debugging-related
IS_DEBUG_ENABLED = bool(os.environ.get("IS_DEBUG_ENABLED", False))
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")

# Set to True when running in production (on the hosted version)
# Used as a feature flag to enable or disable certain features
IS_PROD = os.environ.get("IS_PROD", False)
