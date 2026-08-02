"""Tests for FilingSubPortUsage model."""
from app.models import FilingSubPortUsage


def test_model_table_args_has_unique_constraint():
    table = FilingSubPortUsage.__table__
    constraint_names = {c.name for c in table.constraints}
    assert "uq_main_port_sub_port" in constraint_names


def test_model_fields():
    table = FilingSubPortUsage.__table__
    columns = {c.name for c in table.columns}
    expected = {
        "id", "main_port_number", "port_number", "carrier",
        "filing_task_id", "qualification_id", "generated_at", "operator_id",
    }
    assert expected <= columns


def test_filing_task_fk_set_null_on_delete():
    table = FilingSubPortUsage.__table__
    fk = list(table.columns["filing_task_id"].foreign_keys)[0]
    assert fk.ondelete == "SET NULL"
