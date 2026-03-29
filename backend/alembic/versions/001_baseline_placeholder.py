"""Baseline placeholder — run autogenerate against your database when needed.

Revision ID: 001
Revises:
Create Date: 2026-03-28

For an existing PostgreSQL instance, stamp instead of upgrade:

    alembic stamp head

To generate migrations from models (empty DB or dev clone):

    alembic revision --autogenerate -m "init"
"""

from typing import Sequence, Union

from alembic import op

revision: str = "001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
