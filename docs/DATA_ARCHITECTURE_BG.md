# Архитектура на данните — GPTSBOXES / ShapeWeaver

## Основен принцип

Изходната геометрична база е read-only. Потребителските конфигурации, artwork файловете, офертите и export задачите се съхраняват в отделна writable application база.

```text
read-only geometry source
  -> protected server queries
  -> gptsboxes.viewer-manifest/v1
  -> Three.js / 2D dieline editor

writable application database
  -> configurations
  -> configuration_versions
  -> artwork_assets
  -> quote_requests
  -> export_jobs
  -> users / roles / audit log
```

## Канонични обекти

```text
products
  -> current model version
     -> model parts
        -> model layers
           -> geometry faces
           -> indexed folds
           -> dielines
           -> animation sequences
              -> ordered steps
                 -> concurrent operations
           -> materials
           -> asset references
```

## Публична идентичност

Външните API и проектни файлове не използват вътрешни SQLite integer IDs като постоянни идентификатори.

- продукт: `sourceId`;
- модел: `sourceId + sourceHash/version`;
- слой: `sourceId + sourceHash + layerKey`;
- лице: `layerKey + faceKey`;
- сгъвка: `layerKey + foldIndex`;
- стъпка: `sequenceId + stepIndex`;
- операция: `sequenceId + stepIndex + operationIndex`.

## Viewer manifest

Браузърът получава компилиран contract:

```text
GET /api/v1/products/:sourceId/manifest
```

Manifest-ът съдържа:

- source hash и model version;
- точни face paths и holes;
- layer-prefixed face IDs;
- indexed fold relationships;
- записани `rotate`, `translate` и `rotateMesh` операции;
- dielines;
- material metadata;
- asset references;
- runtime strategy;
- validation и production status;
- export capability matrix.

## Legacy payload compatibility

Когато upstream manifest endpoint върне само `404` или `501`, клиентът може временно да компилира legacy `details + knife + preview` package в същия manifest contract.

Това не е permissive fallback:

- invalid manifest не се заменя мълчаливо с legacy payload;
- слоевете се префиксират и не се смесват;
- unresolved folds се записват като warnings;
- geometry-only продуктите остават exact/static;
- procedural geometry е само диагностичен последен fallback;
- production status остава `unverified`, докато моделът не бъде одобрен.

## Source-of-truth gate

Пълната база се допуска само след:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
PRAGMA user_version;
```

и SHA-256 сравнение с одобрения checksum manifest.

Ако binary файлът липсва или checksum-ът не съвпада:

- няма автоматична promotion;
- няма mass product publishing;
- няма production-approved dieline export;
- системата работи само с доказано валиден subset.
