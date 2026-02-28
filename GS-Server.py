#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Serveur Flask pour l'application de gestion de sophrologie
Compatible en développement et après compilation PyInstaller.
Données persistantes dans %APPDATA%\Gestion_Sophrologie\data
"""

from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import json
import os
from datetime import datetime
from pathlib import Path
import webbrowser
import threading
import time
import sys
import platform

# ----------------------------------------------------------------------------
# Helper pour ressources (support PyInstaller)
# ----------------------------------------------------------------------------
def resource_base():
    """
    Retourne le dossier racine pour servir les fichiers :
    - si on est dans un exe PyInstaller -> sys._MEIPASS
    - sinon -> dossier courant du script (os.path.abspath("."))
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return sys._MEIPASS
    return os.path.abspath(".")

def resource_path(*parts):
    """Construit un chemin absolu à partir de resource_base()."""
    return os.path.join(resource_base(), *parts)

# ----------------------------------------------------------------------------
# Configuration Flask
# ----------------------------------------------------------------------------
# On ne fixe pas static_folder ici — on sert manuellement via send_from_directory
app = Flask(__name__)
CORS(app)

# ----------------------------------------------------------------------------
# Gestion du dossier DATA (dans %APPDATA% ou équivalent)
# ----------------------------------------------------------------------------
def get_data_folder():
    if platform.system() == "Windows":
        appdata = os.getenv("APPDATA")
        if not appdata:
            appdata = str(Path.home() / "AppData" / "Roaming")  # fallback
        base = Path(appdata)
    else:
        base = Path.home() / ".config"

    data_dir = base / "Gestion_Sophrologie" / "data"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        print(f"Dossier data prêt : {data_dir}")
    except Exception as e:
        print(f"Impossible de créer {data_dir}: {e}")
    return str(data_dir)

DATA_FOLDER = get_data_folder()
DATABASE_FILE = os.path.join(DATA_FOLDER, "database.json")

# ----------------------------------------------------------------------------
# Fonctions utilitaires pour DB
# ----------------------------------------------------------------------------
def get_default_database():
    return {
        "version": "2.0",
        "lastModified": datetime.now().isoformat(),
        "clients": [],
        "parametres": {"sophronisations": [], "exercices": []},
    }

def load_database():
    if os.path.exists(DATABASE_FILE):
        try:
            with open(DATABASE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Erreur lecture DB : {e}")
            return get_default_database()
    return get_default_database()

def save_database(data):
    try:
        data["lastModified"] = datetime.now().isoformat()
        with open(DATABASE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # backup horodaté
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        backup_file = os.path.join(DATA_FOLDER, f"backup_{timestamp}.json")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Erreur sauvegarde : {e}")
        return False

# ----------------------------------------------------------------------------
# Routes : servir frontend (index + static) en mode dev et exe
# ----------------------------------------------------------------------------
@app.route("/api/whereami", methods=["GET"])
def whereami():
    return jsonify({
        "DATA_FOLDER": DATA_FOLDER,
        "DATABASE_FILE": DATABASE_FILE,
        "cwd": os.getcwd(),
        "resource_base": resource_base(),
        "platform": platform.system(),
        "appdata_env": os.getenv("APPDATA"),
    })



@app.route("/", methods=["GET"])
def index():
    base = resource_base()
    index_path = os.path.join(base, "templates", "index.html")
    # fallback : index.html at root
    if not os.path.exists(index_path):
        index_path = os.path.join(base, "index.html")
    if os.path.exists(index_path):
        # serve from templates/index.html when present
        # if index is inside templates folder, send_from_directory templates
        templates_dir = os.path.dirname(index_path)
        return send_from_directory(templates_dir, os.path.basename(index_path))
    abort(404)

@app.route("/static/<path:filename>", methods=["GET"])
def static_files(filename):
    # try serve from resource_base()/static first
    static_dir = resource_path("static")
    if os.path.isdir(static_dir) and os.path.exists(os.path.join(static_dir, filename)):
        return send_from_directory(static_dir, filename)
    # fallback: serve from current folder
    if os.path.exists(os.path.join(resource_base(), filename)):
        return send_from_directory(resource_base(), filename)
    abort(404)

# Fallback generic route for other files (optional)
@app.route("/<path:filename>", methods=["GET"])
def other_files(filename):
    # try resource root
    root = resource_base()
    candidate = os.path.join(root, filename)
    if os.path.exists(candidate):
        return send_from_directory(root, filename)
    abort(404)

# ----------------------------------------------------------------------------
# API routes
# ----------------------------------------------------------------------------
@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify(load_database()), 200

@app.route("/api/data", methods=["POST"])
def post_data():
    try:
        data = request.get_json()
        if not isinstance(data, dict) or "clients" not in data or "parametres" not in data:
            return jsonify({"error": "Format de données invalide"}), 400
        if save_database(data):
            return jsonify({"status": "success"}), 200
        return jsonify({"error": "Erreur lors de la sauvegarde"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/backup", methods=["POST"])
def create_backup():
    try:
        data = request.get_json()
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        backup_file = os.path.join(DATA_FOLDER, f"backup_{timestamp}.json")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success", "file": backup_file}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/backups", methods=["GET"])
def list_backups():
    try:
        backups = []
        for filename in sorted(os.listdir(DATA_FOLDER), reverse=True):
            if filename.startswith("backup_") and filename.endswith(".json"):
                filepath = os.path.join(DATA_FOLDER, filename)
                backups.append({
                    "filename": filename,
                    "size": os.path.getsize(filepath),
                    "timestamp": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                })
        return jsonify({"backups": backups}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "version": "2.0",
        "database_file": DATABASE_FILE,
        "data_folder": DATA_FOLDER
    }), 200

# ----------------------------------------------------------------------------
# Server start
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    print("="*60)
    print("Serveur Gestion Sophrologie")
    print("="*60)
    print(f"DATA_FOLDER = {DATA_FOLDER}")
    print(f"DATABASE_FILE = {DATABASE_FILE}")
    print("="*60)
    
    app.run(host="localhost", port=5000, debug=False, use_reloader=False)
