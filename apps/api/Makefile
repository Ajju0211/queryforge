
.PHONY: dev start test sync

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

start:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	uv run pytest

sync:
	uv sync --extra dev
