import pytest
from unittest.mock import AsyncMock
from config import get_variant_count
from routes.generate_code import ModelSelectionStage
from llm import Llm


@pytest.mark.parametrize(
    ("generation_type", "input_mode"),
    [
        ("create", "image"),
        ("create", "text"),
        ("update", "image"),
        ("update", "text"),
        ("create", "video"),
        ("update", "video"),
    ],
)
def test_get_variant_count_uses_single_variant_policy(
    generation_type: str, input_mode: str
) -> None:
    """All generation flows stay on one variant to avoid duplicate token spend."""
    assert get_variant_count(generation_type, input_mode) == 1


class TestModelSelectionAllKeys:
    """Test model selection when Gemini, Anthropic, and OpenAI API keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_gemini_anthropic_create(self):
        """All keys: create mode should keep a single variant to avoid duplicate runs."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]
        assert models == expected

    @pytest.mark.asyncio
    async def test_gemini_anthropic_update_text(self):
        """All keys text update: should keep one edit variant to reduce repeated generations."""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]
        assert models == expected

    @pytest.mark.asyncio
    async def test_gemini_anthropic_update(self):
        """All keys image update: should keep one edit variant to reduce repeated generations."""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="image",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]
        assert models == expected

    @pytest.mark.asyncio
    async def test_video_create_prefers_gemini_minimal_then_3_1_high(self):
        """Video create should keep a single Gemini variant to avoid duplicate runs."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="video",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]
        assert models == expected

    @pytest.mark.asyncio
    async def test_video_update_prefers_gemini_minimal_then_3_1_high(self):
        """Video update should also keep a single Gemini variant to avoid duplicate runs."""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="video",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]
        assert models == expected

    @pytest.mark.asyncio
    async def test_selected_model_overrides_automatic_variant_mix(self):
        """Explicit model selection should still only produce one variant."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
            selected_model=Llm.GPT_5_4_2026_03_05_LOW,
        )

        assert models == [Llm.GPT_5_4_2026_03_05_LOW]

    @pytest.mark.asyncio
    async def test_selected_model_uses_shared_variant_count_policy(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Model selection should read variant count from the shared policy helper."""

        def fake_get_variant_count(generation_type: str, input_mode: str) -> int:
            assert generation_type == "update"
            assert input_mode == "text"
            return 2

        monkeypatch.setattr(
            "routes.generate_code.get_variant_count", fake_get_variant_count
        )

        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
            selected_model=Llm.GPT_5_4_2026_03_05_LOW,
        )

        assert models == [
            Llm.GPT_5_4_2026_03_05_LOW,
            Llm.GPT_5_4_2026_03_05_LOW,
        ]


class TestModelSelectionOpenAIAnthropic:
    """Test model selection when only OpenAI and Anthropic keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_openai_anthropic(self):
        """OpenAI + Anthropic: create mode keeps the top single candidate only."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key=None,
        )

        expected = [Llm.CLAUDE_OPUS_4_6]
        assert models == expected


class TestModelSelectionAnthropicOnly:
    """Test model selection when only Anthropic key is present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_anthropic_only(self):
        """Anthropic only: create mode keeps the top single candidate only."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key=None,
            anthropic_api_key="key",
            gemini_api_key=None,
        )

        expected = [Llm.CLAUDE_OPUS_4_6]
        assert models == expected


class TestModelSelectionOpenAIOnly:
    """Test model selection when only OpenAI key is present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_openai_only(self):
        """OpenAI only: create mode keeps the top single candidate only."""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key=None,
            gemini_api_key=None,
        )

        expected = [Llm.GPT_5_2_CODEX_HIGH]
        assert models == expected


class TestModelSelectionNoKeys:
    """Test model selection when no API keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_no_keys_raises_error(self):
        """No keys: Should raise an exception"""
        with pytest.raises(Exception, match="No OpenAI or Anthropic key"):
            await self.model_selector.select_models(
                generation_type="create",
                input_mode="text",
                openai_api_key=None,
                anthropic_api_key=None,
                gemini_api_key=None,
            )


class TestModelSelectionExplicitModelValidation:
    def setup_method(self):
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_selected_model_requires_matching_provider_key(self):
        with pytest.raises(
            Exception, match="Selected model requires an OpenAI API key."
        ):
            await self.model_selector.select_models(
                generation_type="create",
                input_mode="text",
                openai_api_key=None,
                anthropic_api_key="key",
                gemini_api_key="key",
                selected_model=Llm.GPT_5_4_2026_03_05_LOW,
            )

    @pytest.mark.asyncio
    async def test_video_mode_rejects_non_gemini_selected_model(self):
        with pytest.raises(
            Exception, match="Video mode only supports Gemini video models."
        ):
            await self.model_selector.select_models(
                generation_type="create",
                input_mode="video",
                openai_api_key="key",
                anthropic_api_key="key",
                gemini_api_key="key",
                selected_model=Llm.CLAUDE_OPUS_4_6,
            )
