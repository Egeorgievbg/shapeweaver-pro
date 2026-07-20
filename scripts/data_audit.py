#!/usr/bin/env python3
"""Generate the complete GPTSBOXES data-forensics report set."""
import argparse
import csv
import json
from pathlib import Path

from audit_core import EXPECTED, audit, now, save


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--output", default="data/reports")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    output = (root / args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)

    inventory, databases, archives, assets, corrupt, truncated, hashes, metadata = audit(
        root, output
    )
    inventory.sort(key=lambda record: record["path"])

    save(
        output / "full-file-inventory.json",
        {
            "schema": "gptsboxes.file-inventory/v1",
            "generated_at": now(),
            "root": str(root),
            "count": len(inventory),
            "files": inventory,
            "structured_metadata": metadata,
        },
    )
    with (output / "full-file-inventory.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        writer = csv.DictWriter(
            handle, fieldnames=list(inventory[0]) if inventory else ["path"]
        )
        writer.writeheader()
        writer.writerows(inventory)

    duplicates = [
        {"sha256": digest, "count": len(paths), "paths": sorted(paths)}
        for digest, paths in hashes.items()
        if len(paths) > 1
    ]
    reports = {
        "archive-inventory.json": {"archives": archives},
        "database-inventory.json": {"databases": databases},
        "asset-inventory.json": {"assets": assets},
        "duplicate-hashes.json": {"groups": duplicates},
        "corrupt-files.json": {"files": corrupt},
        "truncated-files.json": {"files": truncated},
    }
    for filename, payload in reports.items():
        payload["generated_at"] = now()
        save(output / filename, payload)

    save(
        output / "orphan-files.json",
        {
            "generated_at": now(),
            "status": "reference-parser-required",
            "files": [],
        },
    )

    candidates = []
    for database in databases:
        score = 0
        if database.get("valid"):
            score = 100 if database.get("checksum_match") is True else 70
        candidates.append(
            {
                "path": database["relative_path"],
                "kind": "sqlite",
                "score": score,
                "valid": database.get("valid"),
                "checksum_match": database.get("checksum_match"),
            }
        )
    for record in inventory:
        if record["extension"] in {".jsonl", ".ndjson"} and record["syntax_valid"]:
            candidates.append(
                {"path": record["path"], "kind": "jsonl", "score": 60, "valid": True}
            )
    candidates.sort(key=lambda candidate: (-candidate["score"], candidate["path"]))
    selected = candidates[0] if candidates and candidates[0]["score"] >= 70 else None
    promotion_allowed = bool(selected and selected["score"] >= 100)

    save(
        output / "source-of-truth-candidates.json",
        {
            "generated_at": now(),
            "decision": selected,
            "mass_promotion_allowed": promotion_allowed,
            "candidates": candidates,
        },
    )

    found_database_names = {Path(item["relative_path"]).name for item in databases}
    conflicts = [
        {"type": "documented-binary-missing", "name": name, "severity": "blocker"}
        for name in sorted(set(EXPECTED) - found_database_names)
    ]
    if truncated:
        conflicts.append(
            {
                "type": "known-truncated-aggregates-present",
                "count": len(truncated),
                "severity": "blocker",
            }
        )
    save(
        output / "source-conflicts.json",
        {"generated_at": now(), "conflicts": conflicts},
    )

    summary = {
        "generated_at": now(),
        "files": len(inventory),
        "bytes": sum(record["size"] for record in inventory),
        "databases": len(databases),
        "archives": len(archives),
        "assets": len(assets),
        "corrupt": len(corrupt),
        "truncation_risks": len(truncated),
        "duplicate_hash_groups": len(duplicates),
        "source_of_truth_selected": selected["path"] if selected else None,
        "mass_promotion_allowed": promotion_allowed,
    }
    save(output / "audit-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if not corrupt else 2


if __name__ == "__main__":
    raise SystemExit(main())
