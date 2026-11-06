import re
import requests
import pytest

BASE = "http://localhost:4173"


@pytest.fixture(scope="module")
def index():
    r = requests.get(BASE + "/", timeout=10)
    return r


def _asset_urls(html):
    return re.findall(r'(?:src|href)="(\./assets/[^"]+|/assets/[^"]+)"', html)


class TestIndex:
    def test_index_200_html(self, index):
        assert index.status_code == 200
        assert "text/html" in index.headers["content-type"]

    def test_index_has_canvas_and_terminal(self, index):
        for s in ['<canvas id="rain"', 'id="terminal"', 'id="terminal-input"', 'id="boot"', 'id="crt"']:
            assert s in index.text

    def test_index_meta(self, index):
        assert "<title>Arthur Rio (arthurio)" in index.text
        assert 'lang="en"' in index.text

    def test_fallback_matches_profile(self, index):
        for s in ["arthur.rio44@gmail.com", "https://www.linkedin.com/in/arthurio/",
                  "https://github.com/arthurio/fastapi-filter", "modelcode.ai", "SQLAlchemy",
                  "he/him/his", "<noscript>"]:
            assert s in index.text

    def test_canvas_aria_hidden(self, index):
        assert re.search(r'<canvas id="rain" aria-hidden="true"', index.text)


class TestAssets:
    def test_asset_urls_are_relative_base(self, index):
        urls = _asset_urls(index.text)
        assert len(urls) >= 2
        assert all(u.startswith("./assets/") for u in urls)

    def test_js_and_css_served(self, index):
        for u in _asset_urls(index.text):
            r = requests.get(BASE + "/" + u[2:], timeout=10)
            assert r.status_code == 200
            assert len(r.content) > 100
            if u.endswith(".js"):
                assert "javascript" in r.headers["content-type"]
            if u.endswith(".css"):
                assert "css" in r.headers["content-type"]

    def test_js_bundle_contains_commands_and_github_api(self, index):
        js = [u for u in _asset_urls(index.text) if u.endswith(".js")][0]
        body = requests.get(BASE + "/" + js[2:], timeout=10).text
        for cmd in ["whoami", "experience", "skills", "projects", "contact", "matrix", "theme"]:
            assert cmd in body
        assert "api.github.com/users/" in body
        assert "fastapi-filter" in body

    @pytest.mark.parametrize("w", ["400", "700"])
    def test_font_served(self, w):
        r = requests.get(f"{BASE}/fonts/jetbrains-mono-latin-{w}-normal.woff2", timeout=10)
        assert r.status_code == 200
        assert r.content[:4] == b"wOF2"

    def test_font_license_retained(self):
        r = requests.get(BASE + "/fonts/OFL.txt", timeout=10)
        assert r.status_code == 200
        assert "SIL OPEN FONT LICENSE" in r.text.upper()

    def test_css_references_fonts(self, index):
        css = [u for u in _asset_urls(index.text) if u.endswith(".css")][0]
        body = requests.get(BASE + "/" + css[2:], timeout=10).text
        assert "JetBrains Mono" in body and "fonts/jetbrains-mono" in body


class TestNegative:
    def test_missing_asset_not_200_html(self):
        r = requests.get(BASE + "/assets/nope.js", timeout=10)
        # SPA fallback may serve index.html; it must never be served as JS content
        assert r.status_code in (404, 200)
        if r.status_code == 200:
            assert "javascript" not in r.headers["content-type"]

    def test_missing_font_not_font(self):
        r = requests.get(BASE + "/fonts/missing.woff2", timeout=10)
        assert r.content[:4] != b"wOF2"
