from flask import Flask

from .config import Config
from .routes.pages import bp as pages_bp
from .routes.api import bp as api_bp


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=False)
    app.config.from_object(Config)

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app