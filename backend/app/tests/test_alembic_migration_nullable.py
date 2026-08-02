"""Smoke test for the nullable-fields migration."""
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_migration_runs_cleanly():
    # backend/ is two levels up from this test file's package.
    backend_dir = Path(__file__).resolve().parents[2]
    cfg = Config(str(backend_dir / "alembic.ini"))
    # Upgrade to head should not raise.
    command.upgrade(cfg, "head")
