from app.markdown_render import clean_article_markdown, render_markdown, sanitize_html_fragment


def test_render_markdown_removes_ai_review_notes_section() -> None:
    html = render_markdown(
        "\n".join(
            [
                "# Article",
                "",
                "Useful body.",
                "",
                "## Review Notes",
                "",
                "> [!IMPORTANT] I tried publishing again exactly twice, then stopped as requested.",
                "",
                "- Both attempts returned: Translation request failed: Server error '503 Service Unavailable'",
                "- Memory was updated with the current blocker.",
            ]
        )
    )

    assert "Useful body" in html
    assert "Review Notes" not in html
    assert "Translation request failed" not in html
    assert "Memory was updated" not in html


def test_sanitize_html_fragment_removes_ai_review_notes_section() -> None:
    html = sanitize_html_fragment(
        """
        <h1>Article</h1>
        <p>Useful body.</p>
        <h2 id="review-notes">Review Notes</h2>
        <blockquote><p>[!IMPORTANT] The article is still not live.</p></blockquote>
        <ul>
          <li>Target URL still returns 404.</li>
          <li>Translation request failed: Server error '503 Service Unavailable'.</li>
        </ul>
        """
    )

    assert "Useful body" in html
    assert "Review Notes" not in html
    assert "still not live" not in html
    assert "Translation request failed" not in html


def test_review_notes_without_ai_publish_failure_signal_are_preserved() -> None:
    markdown = clean_article_markdown(
        "\n".join(
            [
                "# Product Review",
                "",
                "## Review Notes",
                "",
                "Use these notes to compare customer support workflows.",
            ]
        )
    )

    assert "Review Notes" in markdown
    assert "customer support workflows" in markdown
