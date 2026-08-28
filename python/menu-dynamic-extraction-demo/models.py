# Stagehand + Browserbase: Restaurant Menu Extractor - Data Models
# See README.md for full documentation

"""Pydantic models and JSON schemas for menu extraction."""

from typing import Optional, List
from pydantic import BaseModel, Field


class MenuItem(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[str] = None


class MenuCategory(BaseModel):
    """
    A category within a section.
    e.g., "Antipasti", "Pizza", "Pasta"
    """
    category_name: str
    items: List[MenuItem]


class MenuSection(BaseModel):
    """
    A full menu section, e.g., "Lunch", "Dinner", "Dessert".
    Each section contains its own categories.
    """
    section_name: str
    categories: List[MenuCategory]


class Menu(BaseModel):
    """
    The full restaurant menu.
    Compatible with restaurants with multiple menu pages or subsections.
    """
    sections: List[MenuSection]


# Manual JSON schema for Gemini API compatibility (avoids Pydantic's $defs)
MENU_SCHEMA = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "description": "Menu sections (e.g., Lunch, Dinner, Dessert)",
            "items": {
                "type": "object",
                "properties": {
                    "section_name": {
                        "type": "string",
                        "description": "Name of the menu section"
                    },
                    "categories": {
                        "type": "array",
                        "description": "Categories within this section",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category_name": {
                                    "type": "string",
                                    "description": "Name of the category (e.g., Appetizers, Entrees)"
                                },
                                "items": {
                                    "type": "array",
                                    "description": "Menu items in this category",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {
                                                "type": "string",
                                                "description": "Item name"
                                            },
                                            "description": {
                                                "type": "string",
                                                "description": "Item description"
                                            },
                                            "price": {
                                                "type": "string",
                                                "description": "Item price"
                                            }
                                        },
                                        "required": ["name"]
                                    }
                                }
                            },
                            "required": ["category_name", "items"]
                        }
                    }
                },
                "required": ["section_name", "categories"]
            }
        }
    },
    "required": ["sections"]
}
