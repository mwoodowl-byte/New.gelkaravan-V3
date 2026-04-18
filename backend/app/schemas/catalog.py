"""Catalog schemas."""
from pydantic import BaseModel
from typing import Optional, List


class SectionOut(BaseModel):
    id: int
    name: str
    slug: Optional[str]
    sort_order: int
    children: List["SectionOut"] = []

    model_config = {"from_attributes": True}


SectionOut.model_rebuild()


class PhotoOut(BaseModel):
    id: int
    file_path: str
    sort_order: int
    variant_label: Optional[str] = None
    url: str

    model_config = {"from_attributes": True}


class ProductListItem(BaseModel):
    article: str
    name: str
    unit: str
    price: Optional[float] = None
    stock: Optional[int] = None
    pack_size: Optional[int] = None
    box_size: Optional[int] = None
    has_photo: bool
    photo_url: Optional[str] = None   # первое фото для превью
    section_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ProductDetail(ProductListItem):
    full_name: Optional[str] = None
    note: Optional[str] = None
    barcode_ean13: Optional[str] = None
    photos: List[PhotoOut] = []
