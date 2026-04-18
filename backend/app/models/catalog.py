"""Catalog models — sections, products, photos."""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CatalogSection(Base):
    __tablename__ = "catalog_sections"

    id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey("catalog_sections.id"), nullable=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    children = relationship("CatalogSection", back_populates="parent")
    parent = relationship("CatalogSection", back_populates="children", remote_side=[id])
    products = relationship("Product", back_populates="section")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    article = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    full_name = Column(String(1000), nullable=True)
    unit = Column(String(20), default="шт")
    price = Column(Float, nullable=True)
    stock = Column(Integer, nullable=True)
    pack_size = Column(Integer, nullable=True)   # штук в упаковке
    box_size = Column(Integer, nullable=True)    # упаковок в коробке
    barcode_ean13 = Column(String(13), nullable=True, index=True)
    note = Column(Text, nullable=True)
    section_id = Column(Integer, ForeignKey("catalog_sections.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    section = relationship("CatalogSection", back_populates="products")
    photos = relationship("ProductPhoto", back_populates="product",
                         order_by="ProductPhoto.sort_order",
                         cascade="all, delete-orphan")


class ProductPhoto(Base):
    __tablename__ = "product_photos"

    id = Column(Integer, primary_key=True)
    article = Column(String(100), ForeignKey("products.article", ondelete="CASCADE"),
                    nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    variant_label = Column(String(200), nullable=True)  # "Сочи", "Геленджик", "KIA" и т.д.
    description = Column(Text, nullable=True)
    embedding = Column(LargeBinary, nullable=True)       # OpenAI embedding для AI-поиска
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="photos")
