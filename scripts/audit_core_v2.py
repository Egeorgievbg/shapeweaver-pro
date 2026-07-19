from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import sqlite3
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

DATABASE_EXTENSIONS = {".sqlite", ".sqlite3", ".db"}
JSON_EXTENSIONS = {".json", ".jsonl", ".ndjson"}
ARCHIVE_EXTENSIONS = {".zip", ".zst", ".gz", ".tar"}
ASSET_EXTENSIONS = {
    ".glb",
    ".gltf",
    ".bin",
    ".obj",
    ".mtl",
    ".fbx",
    ".stl",
    ".ply",
    ".3mf",
    ".svg",
    ".dxf",
    ".ai",
    ".eps",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".tif",
    ".tiff",
    ".hdr",
    ".exr",
    ".ktx2",
}
SKIP_DIRECTORIES = {".git", "node_modules", ".output", "dist", "build", ".next", ".cache"}
SKIP_FILES = {"audit-console.json", "audit-exit-status.txt"}
EXPECTED = {
    "gptsboxes_visualization.sqlite": "d0476452d25e01070938581f57c17ec0df69fc4605b7f55714366575808432c3",
    "gptsboxes_visualization_runtime.sqlite": "fd502ee5b5b495f076b6004389c5d6a38f59ed8a461fb62f45dc3bbc3772b17d",
}
TRUNCATED = {
    "data/backup/db_backup_latest.json",
    "data/db-export/json/products.json",
    "data/db-export/json/staging_records.json",
    "data/import/unzipped/perfect-products-data-ngrok/api/products.index.json",
    "data/import/unzipped/perfect-products-data-ngrok/catalog.json",
    "data/import/unzipped/perfect-products-data-ngrok/catalog.lite.json",
    "data/import-dry-run/output/db.staged.json",
    "data/reconciliation-output/configurator-catalog.hybrid-preview.json",
    "data/reconciliation-output/configurator-data.hybrid-preview.json",
    "data/reconciliation-output/configurator-dielines.hybrid-preview.json",
    "data/seo_records.json",
    "database/active-configurator-data.json",
    "database/active-dielines.json",
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def strip_json_comments(source: str) -> str:
    result: list[str] = []
    index = 0
    in_string = False
    escaped = False
    while index < len(source):
        char = source[index]
        next_char = source[index + 1] if index + 1 < len(source) else ""
        if in_string:
            result.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            index += 1
            continue
        if char == '"':
            in_string = True
            result.append(char)
            index += 1
            continue
        if char == "/" and next_char == "/":
            result.extend("  ")
            index += 2
            while index < len(source) and source[index] not in "\r\n":
                result.append(" ")
                index += 1
            continue
        if char == "/" and next_char == "*":
            result.extend("  ")
            index += 2
            while index < len(source):
                if index + 1 < len(source) and source[index] == "*" and source[index + 1] == "/":
                    result.extend("  ")
                    index += 2
                    break
                result.append("\n" if source[index] == "\n" else " ")
                index += 1
            continue
        result.append(char)
        index += 1
    return "".join(result)


def check_json(path: Path) -> tuple[bool, dict[str, Any], str | None]:
    try:
        if path.suffix.lower() in {".jsonl", ".ndjson"}:
            rows = 0
            for line in path.read_text(encoding="utf-8-sig").splitlines():
                if line.strip():
                    json.loads(line)
                    rows += 1
            return True, {"rows": rows}, None
        source = path.read_text(encoding="utf-8-sig")
        if path.name.startswith("tsconfig") or path.name.endswith(".jsonc"):
            source = strip_json_comments(source)
        value = json.loads(source)
        return (
            True,
            {
                "type": type(value).__name__,
                "rows": len(value) if isinstance(value, (list, dict)) else None,
            },
            None,
        )
    except Exception as error:
        return False, {}, f"{type(error).__name__}: {error}"


def check_db(path: Path) -> dict[str, Any]:
    result: dict[str, Any] = {"path": str(path), "read_only": True}
    try:
        connection = sqlite3.connect(
            f"file:{path.resolve().as_posix()}?mode=ro",
            uri=True,
            timeout=5,
        )
        connection.execute("PRAGMA query_only=ON")
        result["integrity_check"] = connection.execute("PRAGMA integrity_check").fetchone()[0]
        result["foreign_key_errors"] = len(
            connection.execute("PRAGMA foreign_key_check").fetchall()
        )
        result["user_version"] = connection.execute("PRAGMA user_version").fetchone()[0]
        result["tables"] = []
        for (name,) in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ):
            escaped = name.replace('"', '""')
            rows = connection.execute(f'SELECT COUNT(*) FROM "{escaped}"').fetchone()[0]
            result["tables"].append({"name": name, "rows": rows})
        connection.close()
        result["valid"] = (
            result["integrity_check"] == "ok" and result["foreign_key_errors"] == 0
        )
    except Exception as error:
        result.update(valid=False, error=f"{type(error).__name__}: {error}")
    return result


def scan(root: Path, output: Path) -> Iterable[Path]:
    resolved_output = output.resolve()
    for base, directories, names in os.walk(root):
        directory = Path(base)
        directories[:] = [
            name
            for name in directories
            if name not in SKIP_DIRECTORIES
            and not (directory / name).resolve().is_relative_to(resolved_output)
        ]
        for name in names:
            if name in SKIP_FILES:
                continue
            path = directory / name
            if not path.resolve().is_relative_to(resolved_output):
                yield path


def audit(root: Path, output: Path):
    inventory: list[dict[str, Any]] = []
    databases: list[dict[str, Any]] = []
    archives: list[dict[str, Any]] = []
    assets: list[dict[str, Any]] = []
    corrupt: list[dict[str, Any]] = []
    truncated: list[dict[str, Any]] = []
    hashes: defaultdict[str, list[str]] = defaultdict(list)
    metadata: dict[str, dict[str, Any]] = {}

    for path in scan(root, output):
        relative = path.relative_to(root).as_posix()
        stat = path.stat()
        extension = path.suffix.lower()
        digest = sha(path)
        hashes[digest].append(relative)
        syntax_valid = None
        semantic_valid = None
        error = None
        status = "ok"
        action = "review"

        if extension in JSON_EXTENSIONS:
            syntax_valid, item_metadata, error = check_json(path)
            semantic_valid = syntax_valid
            metadata[relative] = item_metadata
            if not syntax_valid:
                status = "corrupt"
                action = "quarantine"
                corrupt.append({"path": relative, "error": error, "sha256": digest})

        if relative in TRUNCATED:
            status = "known-truncation-risk"
            action = "exclude-from-source-of-truth"
            truncated.append(
                {
                    "path": relative,
                    "size": stat.st_size,
                    "syntax_valid": syntax_valid,
                    "sha256": digest,
                }
            )

        if extension in DATABASE_EXTENSIONS:
            database = check_db(path)
            database.update(
                relative_path=relative,
                sha256=digest,
                expected_sha256=EXPECTED.get(path.name),
            )
            database["checksum_match"] = (
                digest == database["expected_sha256"]
                if database["expected_sha256"]
                else None
            )
            databases.append(database)
            syntax_valid = bool(database["valid"])
            semantic_valid = bool(database["valid"]) and database["checksum_match"] is not False
            if not semantic_valid:
                status = "database-validation-failed"
                action = "quarantine"
                corrupt.append(
                    {
                        "path": relative,
                        "error": database.get("error") or "integrity/checksum failure",
                        "sha256": digest,
                    }
                )

        if extension == ".zip":
            try:
                with zipfile.ZipFile(path) as archive:
                    bad_member = archive.testzip()
                    item = {
                        "relative_path": relative,
                        "sha256": digest,
                        "valid": bad_member is None,
                        "bad_member": bad_member,
                        "members": [
                            {"path": info.filename, "size": info.file_size}
                            for info in archive.infolist()
                        ],
                    }
            except Exception as archive_error:
                item = {
                    "relative_path": relative,
                    "sha256": digest,
                    "valid": False,
                    "error": str(archive_error),
                }
            archives.append(item)
        elif extension in ARCHIVE_EXTENSIONS:
            archives.append(
                {
                    "relative_path": relative,
                    "sha256": digest,
                    "valid": None,
                    "note": "external decompressor required",
                }
            )

        if extension in ASSET_EXTENSIONS:
            assets.append(
                {
                    "path": relative,
                    "size": stat.st_size,
                    "sha256": digest,
                    "format": extension.lstrip("."),
                    "mime_type": mimetypes.guess_type(path.name)[0]
                    or "application/octet-stream",
                }
            )

        if extension in DATABASE_EXTENSIONS:
            classification = "database"
        elif extension in ARCHIVE_EXTENSIONS:
            classification = "archive"
        elif extension in ASSET_EXTENSIONS:
            classification = "asset"
        elif extension in JSON_EXTENSIONS:
            classification = "structured-data"
        elif extension in {".ts", ".tsx", ".js", ".jsx", ".py"}:
            classification = "source-code"
        else:
            classification = "document"

        inventory.append(
            {
                "path": relative,
                "size": stat.st_size,
                "modified_at": datetime.fromtimestamp(
                    stat.st_mtime, timezone.utc
                ).isoformat().replace("+00:00", "Z"),
                "extension": extension,
                "mime_type": mimetypes.guess_type(path.name)[0]
                or "application/octet-stream",
                "sha256": digest,
                "classification": classification,
                "syntax_valid": syntax_valid,
                "semantic_valid": semantic_valid,
                "status": status,
                "recommended_action": action,
                "error": error,
            }
        )

    return (
        inventory,
        databases,
        archives,
        assets,
        corrupt,
        truncated,
        hashes,
        metadata,
    )
