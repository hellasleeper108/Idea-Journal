"""
Backend tests for Idea Journal API.

Runs against the FastAPI app using TestClient so no server is needed.
"""

import json
import tempfile
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Patch DATA_DIR before importing the app
from backend import storage
TEST_DIR = Path(tempfile.mkdtemp())
storage.DATA_DIR = TEST_DIR

from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_data():
    """Reset ideas.json before each test."""
    storage._write([])
    yield
    storage._write([])


# ── Health ──────────────────────────────────────────────────────────────────

def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "version": "1.0.0"}


# ── Create ──────────────────────────────────────────────────────────────────

class TestCreate:
    def test_create_basic(self):
        resp = client.post("/ideas", json={
            "hook": "Test idea",
            "seed": "The tech",
            "footprint": "v0.1",
            "tags": ["test"],
            "status": "raw",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["hook"] == "Test idea"
        assert data["seed"] == "The tech"
        assert data["footprint"] == "v0.1"
        assert data["tags"] == ["test"]
        assert data["status"] == "raw"
        assert data["score"] is None
        assert data["id"].startswith("idea_")
        assert "createdAt" in data
        assert "updatedAt" in data

    def test_create_minimal(self):
        resp = client.post("/ideas", json={})
        assert resp.status_code == 201
        data = resp.json()
        assert data["hook"] == ""
        assert data["seed"] == ""
        assert data["footprint"] == ""
        assert data["tags"] == []
        assert data["status"] == "raw"
        assert data["score"] is None

    def test_create_with_score(self):
        resp = client.post("/ideas", json={"hook": "Scored", "score": 8})
        assert resp.status_code == 201
        assert resp.json()["score"] == 8


# ── List / Read ─────────────────────────────────────────────────────────────

class TestList:
    def test_list_empty(self):
        resp = client.get("/ideas")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_all(self):
        client.post("/ideas", json={"hook": "A"})
        client.post("/ideas", json={"hook": "B"})
        resp = client.get("/ideas")
        assert len(resp.json()) == 2

    def test_filter_by_status(self):
        client.post("/ideas", json={"hook": "A", "status": "raw"})
        client.post("/ideas", json={"hook": "B", "status": "active"})
        raw = client.get("/ideas?status=raw")
        assert len(raw.json()) == 1
        assert raw.json()[0]["hook"] == "A"
        active = client.get("/ideas?status=active")
        assert len(active.json()) == 1
        assert active.json()[0]["hook"] == "B"

    def test_filter_by_tag(self):
        client.post("/ideas", json={"hook": "A", "tags": ["alpha"]})
        client.post("/ideas", json={"hook": "B", "tags": ["beta"]})
        resp = client.get("/ideas?tag=alpha")
        assert len(resp.json()) == 1
        assert resp.json()[0]["hook"] == "A"

    def test_search(self):
        client.post("/ideas", json={"hook": "Garden irrigation", "tags": ["hardware"]})
        client.post("/ideas", json={"hook": "CLI changelog tool", "tags": ["cli"]})
        resp = client.get("/ideas?search=garden")
        assert len(resp.json()) == 1
        assert "Garden" in resp.json()[0]["hook"]

    def test_get_by_id(self):
        create = client.post("/ideas", json={"hook": "Find me"}).json()
        resp = client.get(f"/ideas/{create['id']}")
        assert resp.status_code == 200
        assert resp.json()["hook"] == "Find me"

    def test_get_by_id_not_found(self):
        resp = client.get("/ideas/nonexistent")
        assert resp.status_code == 404


# ── Update ──────────────────────────────────────────────────────────────────

class TestUpdate:
    def test_patch_status(self):
        idea = client.post("/ideas", json={"hook": "Park me"}).json()
        resp = client.patch(f"/ideas/{idea['id']}", json={"status": "parked", "score": 6})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "parked"
        assert data["score"] == 6
        assert data["hook"] == "Park me"  # unchanged

    def test_patch_full(self):
        idea = client.post("/ideas", json={"hook": "Old"}).json()
        client.patch(f"/ideas/{idea['id']}", json={
            "hook": "New hook",
            "seed": "New seed",
            "footprint": "New footprint",
            "tags": ["updated"],
            "status": "shipped",
            "score": 10,
        })
        updated = client.get(f"/ideas/{idea['id']}").json()
        assert updated["hook"] == "New hook"
        assert updated["seed"] == "New seed"
        assert updated["footprint"] == "New footprint"
        assert updated["tags"] == ["updated"]
        assert updated["status"] == "shipped"
        assert updated["score"] == 10

    def test_patch_not_found(self):
        resp = client.patch("/ideas/nonexistent", json={"status": "active"})
        assert resp.status_code == 404


# ── Delete ──────────────────────────────────────────────────────────────────

class TestDelete:
    def test_delete(self):
        idea = client.post("/ideas", json={"hook": "Delete me"}).json()
        resp = client.delete(f"/ideas/{idea['id']}")
        assert resp.status_code == 204
        # Verify gone
        get = client.get(f"/ideas/{idea['id']}")
        assert get.status_code == 404

    def test_delete_not_found(self):
        resp = client.delete("/ideas/nonexistent")
        assert resp.status_code == 404


# ── Tags ────────────────────────────────────────────────────────────────────

class TestTags:
    def test_tags_empty(self):
        resp = client.get("/tags")
        assert resp.json() == []

    def test_tags_unique_sorted(self):
        client.post("/ideas", json={"tags": ["zebra", "alpha"]})
        client.post("/ideas", json={"tags": ["alpha", "beta"]})
        resp = client.get("/tags")
        assert resp.json() == ["alpha", "beta", "zebra"]


# ── Ordering ────────────────────────────────────────────────────────────────

class TestOrdering:
    def test_newest_first(self):
        a = client.post("/ideas", json={"hook": "First"}).json()
        b = client.post("/ideas", json={"hook": "Second"}).json()
        all_ideas = client.get("/ideas").json()
        assert all_ideas[0]["hook"] == "Second"  # newest first
        assert all_ideas[1]["hook"] == "First"