from __future__ import annotations
import csv,hashlib,json,mimetypes,os,sqlite3,zipfile
from collections import defaultdict
from datetime import datetime,timezone
from pathlib import Path
DB={'.sqlite','.sqlite3','.db'};JS={'.json','.jsonl','.ndjson'};AR={'.zip','.zst','.gz','.tar'}
AS={'.glb','.gltf','.bin','.obj','.mtl','.fbx','.stl','.ply','.3mf','.svg','.dxf','.ai','.eps','.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff','.hdr','.exr','.ktx2'}
SKIP={'.git','node_modules','.output','dist','build','.next','.cache'}
EXPECTED={'gptsboxes_visualization.sqlite':'d0476452d25e01070938581f57c17ec0df69fc4605b7f55714366575808432c3','gptsboxes_visualization_runtime.sqlite':'fd502ee5b5b495f076b6004389c5d6a38f59ed8a461fb62f45dc3bbc3772b17d'}
TRUNCATED={'data/backup/db_backup_latest.json','data/db-export/json/products.json','data/db-export/json/staging_records.json','data/import/unzipped/perfect-products-data-ngrok/api/products.index.json','data/import/unzipped/perfect-products-data-ngrok/catalog.json','data/import/unzipped/perfect-products-data-ngrok/catalog.lite.json','data/import-dry-run/output/db.staged.json','data/reconciliation-output/configurator-catalog.hybrid-preview.json','data/reconciliation-output/configurator-data.hybrid-preview.json','data/reconciliation-output/configurator-dielines.hybrid-preview.json','data/seo_records.json','database/active-configurator-data.json','database/active-dielines.json'}
def now():return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
def check_json(p):
 try:
  if p.suffix.lower() in {'.jsonl','.ndjson'}:
   n=0
   for line in p.read_text(encoding='utf-8-sig').splitlines():
    if line.strip():json.loads(line);n+=1
   return True,{'rows':n},None
  v=json.loads(p.read_text(encoding='utf-8-sig'));return True,{'type':type(v).__name__,'rows':len(v) if isinstance(v,(list,dict)) else None},None
 except Exception as e:return False,{},f'{type(e).__name__}: {e}'
def check_db(p):
 r={'path':str(p),'read_only':True}
 try:
  c=sqlite3.connect(f'file:{p.resolve().as_posix()}?mode=ro',uri=True,timeout=5);c.execute('PRAGMA query_only=ON');r['integrity_check']=c.execute('PRAGMA integrity_check').fetchone()[0];r['foreign_key_errors']=len(c.execute('PRAGMA foreign_key_check').fetchall());r['user_version']=c.execute('PRAGMA user_version').fetchone()[0];r['tables']=[]
  for (n,) in c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
   q=n.replace('"','""');r['tables'].append({'name':n,'rows':c.execute(f'SELECT COUNT(*) FROM "{q}"').fetchone()[0]})
  c.close();r['valid']=r['integrity_check']=='ok' and r['foreign_key_errors']==0
 except Exception as e:r.update(valid=False,error=f'{type(e).__name__}: {e}')
 return r
def scan(root,out):
 out=out.resolve()
 for base,dirs,names in os.walk(root):
  b=Path(base);dirs[:]=[d for d in dirs if d not in SKIP and not (b/d).resolve().is_relative_to(out)]
  for n in names:
   p=b/n
   if not p.resolve().is_relative_to(out):yield p
def audit(root,out):
 inv=[];dbs=[];archives=[];assets=[];bad=[];trunc=[];groups=defaultdict(list);meta={}
 for p in scan(root,out):
  rel=p.relative_to(root).as_posix();st=p.stat();ext=p.suffix.lower();h=sha(p);groups[h].append(rel);syntax=semantic=None;err=None;status='ok';action='review'
  if ext in JS:
   syntax,m,err=check_json(p);semantic=syntax;meta[rel]=m
   if not syntax:status='corrupt';action='quarantine';bad.append({'path':rel,'error':err,'sha256':h})
  if rel in TRUNCATED:status='known-truncation-risk';action='exclude-from-source-of-truth';trunc.append({'path':rel,'size':st.st_size,'syntax_valid':syntax,'sha256':h})
  if ext in DB:
   d=check_db(p);d.update(relative_path=rel,sha256=h,expected_sha256=EXPECTED.get(p.name));d['checksum_match']=h==d['expected_sha256'] if d['expected_sha256'] else None;dbs.append(d);syntax=d['valid'];semantic=d['valid'] and d['checksum_match'] is not False
   if not semantic:status='database-validation-failed';action='quarantine';bad.append({'path':rel,'error':d.get('error') or 'integrity/checksum failure','sha256':h})
  if ext=='.zip':
   try:
    with zipfile.ZipFile(p) as z:bm=z.testzip();ar={'relative_path':rel,'sha256':h,'valid':bm is None,'bad_member':bm,'members':[{'path':i.filename,'size':i.file_size} for i in z.infolist()]}
   except Exception as e:ar={'relative_path':rel,'sha256':h,'valid':False,'error':str(e)}
   archives.append(ar)
  elif ext in AR:archives.append({'relative_path':rel,'sha256':h,'valid':None,'note':'external decompressor required'})
  if ext in AS:assets.append({'path':rel,'size':st.st_size,'sha256':h,'format':ext.lstrip('.'),'mime_type':mimetypes.guess_type(p.name)[0] or 'application/octet-stream'})
  kind='database' if ext in DB else 'archive' if ext in AR else 'asset' if ext in AS else 'structured-data' if ext in JS else 'source-code' if ext in {'.ts','.tsx','.js','.jsx','.py'} else 'document'
  inv.append({'path':rel,'size':st.st_size,'modified_at':datetime.fromtimestamp(st.st_mtime,timezone.utc).isoformat().replace('+00:00','Z'),'extension':ext,'mime_type':mimetypes.guess_type(p.name)[0] or 'application/octet-stream','sha256':h,'classification':kind,'syntax_valid':syntax,'semantic_valid':semantic,'status':status,'recommended_action':action,'error':err})
 return inv,dbs,archives,assets,bad,trunc,groups,meta
