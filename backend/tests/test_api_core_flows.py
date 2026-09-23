"""Auth, onboarding, meals, quota, logs, media and report API coverage."""

import io
import requests

import pytest
from PIL import Image

from conftest import make_test_user_payload, register_user, auth_headers


def _create_jpeg_bytes() -> bytes:
    image = Image.new("RGB", (40, 40), color=(120, 200, 140))
    output = io.BytesIO()
    image.save(output, format="JPEG")
    return output.getvalue()


class TestHealthAndAuth:
    # Module: health + authentication flows
    def test_health_ok(self, api_client, api_base):
        response = api_client.get(f"{api_base}/health")
        assert response.status_code == 200
        assert response.json().get("status") == "ok"

    def test_unauthenticated_rejected(self, api_client, api_base):
        response = api_client.get(f"{api_base}/dashboard")
        assert response.status_code == 401

    def test_invalid_credentials_rejected(self, api_client, api_base):
        response = api_client.post(f"{api_base}/auth/login", json={"email": "ritim.qa@example.com", "password": "wrong-pass"})
        assert response.status_code == 401

    def test_register_me_logout(self, api_client, api_base):
        payload = make_test_user_payload()
        auth = register_user(api_client, api_base, payload)
        token = auth["session_token"]

        me = api_client.get(f"{api_base}/auth/me", headers=auth_headers(token))
        assert me.status_code == 200
        assert me.json()["email"] == payload["email"].lower()

        logout = api_client.post(f"{api_base}/auth/logout", headers=auth_headers(token))
        assert logout.status_code == 200

        me_after = api_client.get(f"{api_base}/auth/me", headers=auth_headers(token))
        assert me_after.status_code == 401

    def test_google_invalid_session_rejected(self, api_client, api_base):
        response = api_client.post(f"{api_base}/auth/session", json={"session_id": "invalid-session-id-for-test"})
        assert response.status_code in [401, 503]


class TestOnboardingAndQuota:
    # Module: onboarding persistence + detect quota + subscription restrictions
    def test_onboarding_persists_to_me(self, api_client, api_base):
        payload = make_test_user_payload("TEST_Onboarding")
        auth = register_user(api_client, api_base, payload)
        token = auth["session_token"]

        onboarding_payload = {
            "energy": "low",
            "goal": "balance",
            "prep_time": "quick",
            "stress_eating": "sometimes",
        }
        save = api_client.put(f"{api_base}/auth/onboarding", json=onboarding_payload, headers=auth_headers(token))
        assert save.status_code == 200

        me = api_client.get(f"{api_base}/auth/me", headers=auth_headers(token))
        assert me.status_code == 200
        assert me.json().get("onboarding") == onboarding_payload

    def test_free_quota_then_pro_unlimited_then_downgrade_restricts_theme(self, api_client, api_base):
        payload = make_test_user_payload("TEST_Quota")
        auth = register_user(api_client, api_base, payload)
        token = auth["session_token"]
        headers = auth_headers(token)

        for _ in range(5):
            ok = api_client.post(f"{api_base}/detect", json={"sample": "bowl", "image_id": None}, headers=headers)
            assert ok.status_code == 200

        blocked = api_client.post(f"{api_base}/detect", json={"sample": "oats", "image_id": None}, headers=headers)
        assert blocked.status_code == 429

        to_pro = api_client.put(f"{api_base}/subscription", json={"tier": "pro"}, headers=headers)
        assert to_pro.status_code == 200
        assert to_pro.json()["subscription"] == "pro"

        for _ in range(2):
            unlimited = api_client.post(f"{api_base}/detect", json={"sample": "snack", "image_id": None}, headers=headers)
            assert unlimited.status_code == 200

        theme_pro = api_client.put(f"{api_base}/theme", json={"theme": "dark"}, headers=headers)
        assert theme_pro.status_code == 200
        assert theme_pro.json()["theme"] == "dark"

        to_free = api_client.put(f"{api_base}/subscription", json={"tier": "free"}, headers=headers)
        assert to_free.status_code == 200
        assert to_free.json()["subscription"] == "free"
        assert to_free.json()["theme"] == "light"

        theme_free = api_client.put(f"{api_base}/theme", json={"theme": "dark"}, headers=headers)
        assert theme_free.status_code == 403

        dashboard = api_client.get(f"{api_base}/dashboard", headers=headers)
        assert dashboard.status_code == 200
        assert dashboard.json().get("insight") is None
        assert dashboard.json().get("micronutrients") is None


class TestMealAndDailyLog:
    # Module: detect/save meal constraints + score formula + idempotency + log validation
    def test_required_tag_server_validation(self, api_client, api_base):
        payload = make_test_user_payload("TEST_TagValidation")
        auth = register_user(api_client, api_base, payload)
        headers = auth_headers(auth["session_token"])

        detect = api_client.post(f"{api_base}/detect", json={"sample": "bowl", "image_id": None}, headers=headers)
        assert detect.status_code == 200
        detection_id = detect.json()["detection_id"]

        missing_tag = api_client.post(
            f"{api_base}/meals",
            json={"detection_id": detection_id, "meal_type": "lunch"},
            headers=headers,
        )
        assert missing_tag.status_code == 422

    def test_score_formula_and_duplicate_save_idempotent(self, api_client, api_base):
        payload = make_test_user_payload("TEST_Score")
        auth = register_user(api_client, api_base, payload)
        headers = auth_headers(auth["session_token"])

        detect = api_client.post(f"{api_base}/detect", json={"sample": "bowl", "image_id": None}, headers=headers)
        assert detect.status_code == 200
        detection_id = detect.json()["detection_id"]

        save1 = api_client.post(
            f"{api_base}/meals",
            json={"detection_id": detection_id, "tag": "home", "meal_type": "lunch"},
            headers=headers,
        )
        assert save1.status_code == 200
        meal1 = save1.json()
        assert meal1["fni"] == 95
        assert meal1["score"] == round(0.6 * meal1["fni"] + 0.4 * meal1["macro_balance"])

        save2 = api_client.post(
            f"{api_base}/meals",
            json={"detection_id": detection_id, "tag": "restaurant", "meal_type": "dinner"},
            headers=headers,
        )
        assert save2.status_code == 200
        meal2 = save2.json()
        assert meal2["meal_id"] == meal1["meal_id"]
        assert meal2["tag"] == "home"

    def test_fni_values_for_all_source_tags(self, api_client, api_base):
        payload = make_test_user_payload("TEST_FNI")
        auth = register_user(api_client, api_base, payload)
        headers = auth_headers(auth["session_token"])

        expected = {"home": 95, "restaurant": 65, "packaged": 30}
        for tag, fni in expected.items():
            detect = api_client.post(f"{api_base}/detect", json={"sample": "oats", "image_id": None}, headers=headers)
            assert detect.status_code == 200
            save = api_client.post(
                f"{api_base}/meals",
                json={"detection_id": detect.json()["detection_id"], "tag": tag, "meal_type": "lunch"},
                headers=headers,
            )
            assert save.status_code == 200
            meal = save.json()
            assert meal["fni"] == fni
            assert meal["score"] == round(0.6 * meal["fni"] + 0.4 * meal["macro_balance"])

    def test_cross_account_meal_isolation(self, api_client, api_base):
        auth_a = register_user(api_client, api_base, make_test_user_payload("TEST_A"))
        auth_b = register_user(api_client, api_base, make_test_user_payload("TEST_B"))
        headers_a = auth_headers(auth_a["session_token"])
        headers_b = auth_headers(auth_b["session_token"])

        detect = api_client.post(f"{api_base}/detect", json={"sample": "oats", "image_id": None}, headers=headers_a)
        assert detect.status_code == 200

        save = api_client.post(
            f"{api_base}/meals",
            json={"detection_id": detect.json()["detection_id"], "tag": "restaurant", "meal_type": "lunch"},
            headers=headers_a,
        )
        assert save.status_code == 200
        meal_id = save.json()["meal_id"]

        list_b = api_client.get(f"{api_base}/meals", headers=headers_b)
        assert list_b.status_code == 200
        assert all(m["meal_id"] != meal_id for m in list_b.json())

        delete_b = api_client.delete(f"{api_base}/meals/{meal_id}", headers=headers_b)
        assert delete_b.status_code == 404

    def test_sleep_validation_and_recovery_requires_journal(self, api_client, api_base):
        auth = register_user(api_client, api_base, make_test_user_payload("TEST_Log"))
        headers = auth_headers(auth["session_token"])

        bad_sleep = api_client.put(f"{api_base}/logs/today", json={"sleep": 25}, headers=headers)
        assert bad_sleep.status_code == 422

        bad_recovery = api_client.put(f"{api_base}/logs/today", json={"recovery_mode": True, "journal_entry": ""}, headers=headers)
        assert bad_recovery.status_code == 422

        good_log = api_client.put(
            f"{api_base}/logs/today",
            json={"sleep": 5.5, "recovery_mode": True, "journal_entry": "TEST_Bugun bedenimi dinliyorum"},
            headers=headers,
        )
        assert good_log.status_code == 200


class TestMediaAndPDF:
    # Module: image upload/get isolation + report PDF
    def test_upload_image_and_cross_account_access_control(self, api_client, api_base):
        auth_a = register_user(api_client, api_base, make_test_user_payload("TEST_ImageA"))
        auth_b = register_user(api_client, api_base, make_test_user_payload("TEST_ImageB"))
        headers_a = auth_headers(auth_a["session_token"])
        headers_b = auth_headers(auth_b["session_token"])

        files = {"file": ("meal.jpg", _create_jpeg_bytes(), "image/jpeg")}
        upload = requests.post(f"{api_base}/images", files=files, headers=headers_a, timeout=30)
        assert upload.status_code == 200, upload.text
        image_id = upload.json()["image_id"]

        own = api_client.get(f"{api_base}/images/{image_id}", headers=headers_a)
        assert own.status_code == 200
        assert own.headers.get("content-type", "").startswith("image/jpeg")

        other = api_client.get(f"{api_base}/images/{image_id}", headers=headers_b)
        assert other.status_code == 404

        unauth = api_client.get(f"{api_base}/images/{image_id}")
        assert unauth.status_code == 401

    def test_invalid_image_rejected_and_pdf_downloads(self, api_client, api_base):
        auth = register_user(api_client, api_base, make_test_user_payload("TEST_Report"))
        headers = auth_headers(auth["session_token"])

        bad_upload = requests.post(
            f"{api_base}/images",
            files={"file": ("bad.txt", b"not-an-image", "text/plain")},
            headers={"Authorization": headers["Authorization"], "X-Timezone": headers["X-Timezone"]},
            timeout=30,
        )
        assert bad_upload.status_code == 422

        detect = api_client.post(f"{api_base}/detect", json={"sample": "bowl", "image_id": None}, headers=headers)
        assert detect.status_code == 200
        save = api_client.post(
            f"{api_base}/meals",
            json={"detection_id": detect.json()["detection_id"], "tag": "home", "meal_type": "breakfast"},
            headers=headers,
        )
        assert save.status_code == 200

        report = api_client.get(f"{api_base}/report", headers=headers)
        assert report.status_code == 200
        assert report.headers.get("content-type", "").startswith("application/pdf")
        assert report.content[:4] == b"%PDF"
