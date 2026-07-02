"""Shared service utilities."""
from app.models import FilingRecordPublic, PortInfoPublic, QualificationInfoPublic


def record_to_public(db_obj) -> FilingRecordPublic:
    """Convert a FilingRecord ORM object to its public schema."""
    pi_data = PortInfoPublic.model_validate(db_obj.port_info).model_dump() if db_obj.port_info else None
    qi_data = QualificationInfoPublic.model_validate(db_obj.qualification_info).model_dump() if db_obj.qualification_info else None

    return FilingRecordPublic(
        id=db_obj.id,
        record_number=db_obj.record_number,
        status=db_obj.status,
        source_file=db_obj.source_file,
        import_batch=db_obj.import_batch,
        port_info_id=db_obj.port_info_id,
        qualification_info_id=db_obj.qualification_info_id,
        operator_id=db_obj.operator_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
        port_info=PortInfoPublic(**pi_data) if pi_data else None,
        qualification_info=QualificationInfoPublic(**qi_data) if qi_data else None,
    )
