"""Shared fixtures and helpers for API integration tests."""

import os
import time
import uuid
import requests
import pytest


def _base_url() -> str:
    base = os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if not base:
        pytest.skip("EXPO_BACKEND_URL or EXPO_PUBLIC_BACKEND_URL is required for API tests")
    return base.rstrip("/")


@pytest.fixture(scope="session")
def api_base() -> str:
    return f"{_base_url()}/api"


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def make_test_user_payload(name_prefix: str = "TEST_Ritim"):
    unique = f"{int(time.time())}_{uuid.uuid4().hex[:8]}"
    return {
        "name": f"{name_prefix}_{unique}",
        "email": f"test_{unique}@example.com",
        "password": "RitimTest2026!",
    }


def register_user(api_client: requests.Session, api_base: str, payload: dict):
    response = api_client.post(f"{api_base}/auth/register", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["user"]["email"] == payload["email"].lower()
    assert "session_token" in data
    return data


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}", "X-Timezone": "Europe/Istanbul"}
