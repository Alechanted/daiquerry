from flask import Blueprint, current_app, jsonify, request

from app.services.data_store import load_alcohols, load_cocktails
from app.services.validator import validate_submission

bp = Blueprint("api", __name__)


@bp.get("/cocktails")
def cocktails():
    cocktails_data = load_cocktails(current_app.config["DATA_DIR"])
    return jsonify(cocktails_data)


@bp.get("/alcohols")
def alcohols():
    alcohols_data = load_alcohols(current_app.config["DATA_DIR"])
    return jsonify(alcohols_data)


@bp.post("/validate")
def validate():
    payload = request.get_json(silent=True) or {}

    cocktails_data = load_cocktails(current_app.config["DATA_DIR"])
    alcohols_data = load_alcohols(current_app.config["DATA_DIR"])

    result = validate_submission(
        payload=payload,
        cocktails=cocktails_data,
        alcohols=alcohols_data,
    )
    return jsonify(result)