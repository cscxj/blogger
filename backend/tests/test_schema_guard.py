from sqlalchemy import String, Text

from app.schema_guard import _should_resize_post_language_column


def test_should_resize_post_language_column_only_when_needed() -> None:
    assert not _should_resize_post_language_column({"language": {"type": String(64)}})
    assert _should_resize_post_language_column({"language": {"type": String(32)}})
    assert _should_resize_post_language_column({"language": {"type": Text()}})
    assert not _should_resize_post_language_column({})
