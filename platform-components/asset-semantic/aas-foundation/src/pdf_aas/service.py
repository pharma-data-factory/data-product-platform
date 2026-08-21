from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from pdf_aas.lookup import resolve_endpoint, resolve_property
from pdf_aas.models import (
    AssetCreate,
    AssetRelationship,
    AssetUpdate,
    PropertyDefinition,
)
from pdf_aas.repository import DuplicateIdError, NotFoundError, SqliteAasRepository


def create_aas_router(repo: SqliteAasRepository) -> APIRouter:
    router = APIRouter()

    def actor(request: Request) -> str:
        return str(request.headers.get("x-aas-actor") or "anonymous")

    @router.get("/assets")
    def list_assets():
        return [item.model_dump() for item in repo.list_assets()]

    @router.post("/assets", status_code=201)
    def create_asset(payload: AssetCreate, request: Request):
        try:
            return repo.create_asset(payload, actor(request)).model_dump()
        except DuplicateIdError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.get("/assets/{assetId}")
    def get_asset(assetId: str):
        try:
            return repo.get_asset(assetId).model_dump()
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.put("/assets/{assetId}")
    def update_asset(assetId: str, payload: AssetUpdate, request: Request):
        try:
            return repo.update_asset(assetId, payload, actor(request)).model_dump()
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.post("/assets/{assetId}/deactivate")
    def deactivate_asset(assetId: str, request: Request):
        try:
            return repo.deactivate_asset(assetId, actor(request)).model_dump()
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.get("/assets/{assetId}/submodels")
    def list_submodels(assetId: str):
        try:
            return [item.model_dump() for item in repo.get_asset(assetId).submodels]
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.get("/assets/{assetId}/properties")
    def list_properties(assetId: str):
        try:
            return [item.model_dump() for item in repo.get_asset(assetId).properties]
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.post("/assets/{assetId}/properties", status_code=201)
    def add_property(assetId: str, payload: PropertyDefinition, request: Request):
        try:
            return repo.add_property(assetId, payload, actor(request)).model_dump()
        except DuplicateIdError as extra:
            raise HTTPException(status_code=409, detail=str(extra)) from extra
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra
        except ValueError as extra:
            raise HTTPException(status_code=400, detail=str(extra)) from extra

    @router.get("/assets/{assetId}/properties/{propertyId}")
    def get_property(assetId: str, propertyId: str):
        try:
            return repo.get_property(assetId, propertyId).model_dump()
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.get("/assets/{assetId}/properties/{propertyId}/endpoint")
    def get_endpoint(assetId: str, propertyId: str):
        try:
            mapping = resolve_endpoint(repo, assetId, propertyId)
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra
        if mapping is None:
            raise HTTPException(status_code=404, detail="No operational endpoint mapped")
        return mapping.model_dump()

    @router.get("/assets/{assetId}/relationships")
    def list_relationships(assetId: str):
        try:
            return [item.model_dump() for item in repo.get_asset(assetId).relationships]
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.post("/assets/{assetId}/relationships", status_code=201)
    def add_relationship(assetId: str, payload: AssetRelationship, request: Request):
        try:
            return repo.add_relationship(assetId, payload, actor(request)).model_dump()
        except (DuplicateIdError, ValueError) as extra:
            status = 409 if isinstance(extra, DuplicateIdError) else 400
            raise HTTPException(status_code=status, detail=str(extra)) from extra

    @router.get("/resolve/assets/{assetId}")
    def lookup_asset(assetId: str):
        return get_asset(assetId)

    @router.get("/resolve/assets/{assetId}/properties/{propertyId}")
    def lookup_property(assetId: str, propertyId: str):
        try:
            return resolve_property(repo, assetId, propertyId).model_dump()
        except NotFoundError as extra:
            raise HTTPException(status_code=404, detail=str(extra)) from extra

    @router.get("/audit")
    def list_audit(assetId: str | None = None):
        return [item.model_dump() for item in repo.list_audit(assetId)]

    return router
