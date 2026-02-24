from __future__ import annotations

from dataclasses import dataclass
from typing import Any


GLASSWARE = [
    {"id": "highball", "label": "Highball"},
    {"id": "rocks", "label": "Rocks / Old Fashioned"},
    {"id": "cocktail", "label": "Kieliszek koktajlowy"},
    {"id": "wine", "label": "Kieliszek do wina"},
    {"id": "shot", "label": "Kieliszek (Shot)"},
    {"id": "margarita", "label": "Kieliszek do margarity"},
]


def _parse_amount(text: str | None) -> float | None:
    if text is None:
        return None
    raw = str(text).strip().replace(",", ".")
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _find_cocktail(cocktails: list[dict], cocktail_id: int) -> dict | None:
    for c in cocktails:
        if c.get("id") == cocktail_id:
            return c
    return None


def _index_alcohols(alcohols: list[dict]) -> dict[str, dict]:
    return {a["id"]: a for a in alcohols if "id" in a}


def _glass_label(glass_id: str | None) -> str | None:
    if not glass_id:
        return None
    for g in GLASSWARE:
        if g["id"] == glass_id:
            return g["label"]
    return glass_id


def validate_submission(*, payload: dict[str, Any], cocktails: list[dict], alcohols: list[dict]) -> dict[str, Any]:
    """
    payload expected:
    {
      "cocktailId": 10,
      "method": "Wstrząsanie",
      "glassware": "cocktail",
      "ingredients": [
        {"id": "rum-1", "amount": "40"},
        {"id": "soft-3", "amount": "20"}
      ]
    }
    """
    cocktail_id = payload.get("cocktailId")
    if cocktail_id is None:
        return {"ok": False, "errors": ["Brak cocktailId."], "warnings": []}

    try:
        cocktail_id_int = int(cocktail_id)
    except (TypeError, ValueError):
        return {"ok": False, "errors": ["Nieprawidłowy cocktailId."], "warnings": []}

    cocktail = _find_cocktail(cocktails, cocktail_id_int)
    if not cocktail:
        return {"ok": False, "errors": ["Nie znaleziono koktajlu."], "warnings": []}

    alcohol_by_id = _index_alcohols(alcohols)

    user_method = payload.get("method")
    user_glassware = payload.get("glassware")
    user_ings = payload.get("ingredients") or []

    errors: list[str] = []
    warnings: list[str] = []

    # Method
    if user_method != cocktail.get("method"):
        errors.append(f"Błędna metoda przyrządzania. Powinno być: {cocktail.get('method')}")

    # Glassware
    correct_glass_id = cocktail.get("glassware")
    if correct_glass_id and user_glassware != correct_glass_id:
        errors.append(f"Błędne szkło. Powinno być: {_glass_label(correct_glass_id)}")

    # Count
    required = cocktail.get("ingredients") or []
    if len(user_ings) != len(required):
        errors.append(f"Nieprawidłowa liczba składników. Powinno być {len(required)}, jest {len(user_ings)}.")

    # Validate each required ingredient
    brand_required = bool(cocktail.get("brandRequired"))

    # normalize user ingredients into list of dicts: {"id": str, "amount": float|None}
    normalized_user = []
    for item in user_ings:
        ing_id = (item or {}).get("id")
        if not ing_id:
            continue
        normalized_user.append({"id": str(ing_id), "amount": _parse_amount((item or {}).get("amount"))})

    for req in required:
        req_type = req.get("type")
        req_brand = req.get("specificBrand")
        req_amount = req.get("amount")

        found_match = False

        for user in normalized_user:
            alcohol = alcohol_by_id.get(user["id"])
            if not alcohol:
                continue

            alcohol_type = alcohol.get("type")

            # Type matching (odtwarzamy Twoje mapowania)
            type_match = (
                alcohol_type == req_type
                or (req_type in ("Other", "Soft") and alcohol_type == "Inne")
                or (req_type == "Likier" and alcohol_type == "Likier")
            )
            if not type_match:
                continue

            # Brand match (gdy podane)
            if req_brand:
                brand_match = req_brand.lower() in str(alcohol.get("brand", "")).lower()
            else:
                brand_match = True

            # Jeśli brand jest "wymagany", to brak dopasowania brandu = brak matcha
            if brand_required and req_brand and not brand_match:
                continue

            # Amount match (jeśli wymagane)
            if req_amount is not None:
                user_amount = user["amount"]
                if user_amount is None or user_amount != float(req_amount):
                    continue

            # Jeśli brand nie jest wymagany, to traktujemy jako warning
            if req_brand and not brand_match:
                warnings.append(f"Użyto {alcohol.get('brand')} zamiast sugerowanego {req_brand}.")

            found_match = True
            break

        if not found_match:
            label = req.get("label", "Nieznany składnik")
            unit = req.get("unit")
            if req_amount is not None and unit:
                errors.append(f"Brakuje lub błędny składnik: {label} ({req_amount} {unit})")
            else:
                errors.append(f"Brakuje lub błędny składnik: {label}")

    ok = len(errors) == 0
    return {"ok": ok, "errors": errors, "warnings": warnings}