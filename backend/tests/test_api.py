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
    assert register.json()["user"]["role"] == "super_admin"
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
            "language": "en",
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
    assert post["status"] == "draft"
    assert post["language"] == "en"
    assert "<h1" in post["html_content"]
    assert "<script>" not in post["html_content"]
    post_id = post["id"]

    status_rejected = client.patch(
        f"/api/sites/{site_id}/posts/{post_id}",
        json={"status": "published"},
        headers=key_headers,
    )
    assert status_rejected.status_code == 422, status_rejected.text

    list_response = client.get(
        f"/api/sites/{site_id}/posts?language=en&category_id={category_id}&status=draft",
        headers=key_headers,
    )
    assert list_response.status_code == 200, list_response.text
    page = list_response.json()
    assert page["total"] == 1
    assert page["items"][0]["slug"] == "first-post"

    publish_response = client.post(f"/api/sites/{site_id}/posts/{post_id}/publish", headers=key_headers)
    assert publish_response.status_code == 200, publish_response.text
    assert publish_response.json()["status"] == "published"

    public_list = client.get("/api/integration/sites/main-site/posts?language=en", headers=key_headers)
    assert public_list.status_code == 200, public_list.text
    assert public_list.json()[0]["path"] == "/blog/first-post"
    assert public_list.json()[0]["language"] == "en"

    public_detail = client.get("/api/integration/sites/main-site/posts/first-post", headers=key_headers)
    assert public_detail.status_code == 200, public_detail.text
    assert public_detail.json()["meta_title"] == "First SEO title"

    upload = client.post(
        "/api/uploads",
        data={"kind": "avatar"},
        files={"file": ("avatar.png", b"fake-png", "image/png")},
        headers=jwt_headers,
    )
    assert upload.status_code == 200, upload.text
    assert upload.json()["url"].startswith("data:image/png;base64,")

    operator_register = client.post(
        "/api/auth/register",
        json={
            "email": "operator@example.com",
            "password": "password123",
            "nickname": "Operator",
        },
    )
    assert operator_register.status_code == 201, operator_register.text
    assert operator_register.json()["user"]["role"] == "operator"
    operator_headers = {"Authorization": f"Bearer {operator_register.json()['access_token']}"}
    forbidden_site = client.post(
        "/api/sites",
        json={"name": "Operator Site", "slug": "operator-site"},
        headers=operator_headers,
    )
    assert forbidden_site.status_code == 403, forbidden_site.text

    users_response = client.get("/api/users", headers=jwt_headers)
    assert users_response.status_code == 200, users_response.text
    assert len(users_response.json()) >= 2
