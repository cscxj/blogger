import os
from pathlib import Path

TEST_DB = Path("/tmp/blogger-api-test.sqlite3")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ACCESS_KEY_PEPPER"] = "test-pepper"

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_blog_lifecycle_with_access_key() -> None:
    register = client.post(
        "/api/auth/register",
        json={
            "email": "owner@example.com",
            "password": "password123",
            "nickname": "Owner",
        },
    )
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    jwt_headers = {"Authorization": f"Bearer {token}"}

    key_response = client.post("/api/access-keys", json={"name": "ci"}, headers=jwt_headers)
    assert key_response.status_code == 201, key_response.text
    access_key = key_response.json()["access_key"]
    key_headers = {"X-Access-Key": access_key}

    site_response = client.post(
        "/api/sites",
        json={"name": "Main Site", "slug": "main-site", "base_url": "https://example.com"},
        headers=key_headers,
    )
    assert site_response.status_code == 201, site_response.text
    site_id = site_response.json()["id"]

    category_response = client.post(
        f"/api/sites/{site_id}/categories",
        json={"name": "Product", "slug": "product"},
        headers=key_headers,
    )
    assert category_response.status_code == 201, category_response.text
    category_id = category_response.json()["id"]

    post_response = client.post(
        f"/api/sites/{site_id}/posts",
        json={
            "title": "First Post",
            "slug": "first-post",
            "status": "published",
            "markdown_content": "# Hello\n\n<script>alert(1)</script>\n\nWorld",
            "category_id": category_id,
            "meta_title": "First SEO title",
            "meta_description": "First SEO description",
            "cover_image_url": "https://example.com/cover.png",
        },
        headers=key_headers,
    )
    assert post_response.status_code == 201, post_response.text
    post = post_response.json()
    assert post["author"]["email"] == "owner@example.com"
    assert "<h1" in post["html_content"]
    assert "<script>" not in post["html_content"]

    public_list = client.get("/api/integration/sites/main-site/posts", headers=key_headers)
    assert public_list.status_code == 200, public_list.text
    assert public_list.json()[0]["path"] == "/blog/first-post"

    public_detail = client.get("/api/integration/sites/main-site/posts/first-post", headers=key_headers)
    assert public_detail.status_code == 200, public_detail.text
    assert public_detail.json()["meta_title"] == "First SEO title"
