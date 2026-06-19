from __future__ import annotations

from sqlalchemy import inspect, text

from app.db import engine


def _column_names(table: str) -> set[str]:
    inspector = inspect(engine)
    if not inspector.has_table(table):
        return set()
    return {column["name"] for column in inspector.get_columns(table)}


def _add_column(table: str, ddl: str) -> None:
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def ensure_schema() -> None:
    users = _column_names("users")
    if users and "role" not in users:
        _add_column("users", "role VARCHAR(24) NOT NULL DEFAULT 'operator'")

    sites = _column_names("sites")
    if sites and "icon_url" not in sites:
        _add_column("sites", "icon_url VARCHAR(1000)")

    posts = _column_names("posts")
    if posts and "language" not in posts:
        _add_column("posts", "language VARCHAR(16) NOT NULL DEFAULT 'en'")

    with engine.begin() as connection:
        connection.execute(text("UPDATE users SET role = 'operator' WHERE role IS NULL"))
        connection.execute(text("UPDATE posts SET language = 'en' WHERE language IS NULL"))
        super_admin_id = connection.execute(
            text("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1")
        ).scalar_one_or_none()
        if super_admin_id is None:
            first_user_id = connection.execute(
                text("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")
            ).scalar_one_or_none()
            if first_user_id is not None:
                connection.execute(
                    text("UPDATE users SET role = 'super_admin' WHERE id = :id"),
                    {"id": first_user_id},
                )
