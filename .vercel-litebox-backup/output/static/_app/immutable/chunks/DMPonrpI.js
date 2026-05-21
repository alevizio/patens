import{n as e}from"./DHw-IyYA.js";var t=e({buildVariableFont:()=>g,compileFeaIntoFont:()=>p,ensurePython:()=>u,finalizeFont:()=>m,getPythonProgress:()=>c,instancesAsStaticZip:()=>h,otfToWoff2:()=>d,projectToUfoZip:()=>_,subscribeToPython:()=>s,subsetFont:()=>f,ufoZipToProject:()=>v}),n=`https://cdn.jsdelivr.net/pyodide/v0.29.4/full/`,r=null,i=new Set,a={stage:`idle`,message:`Not loaded`},o=e=>{a=e;for(let t of i)t(e)},s=e=>(i.add(e),e(a),()=>i.delete(e)),c=()=>a,l=e=>new Promise((t,n)=>{let r=document.querySelector(`script[data-src="${e}"]`);if(r){if(r.dataset.loaded===`1`)return t();r.addEventListener(`load`,()=>t()),r.addEventListener(`error`,n);return}let i=document.createElement(`script`);i.src=e,i.dataset.src=e,i.async=!0,i.onload=()=>{i.dataset.loaded=`1`,t()},i.onerror=()=>n(Error(`Failed to load ${e}`)),document.head.appendChild(i)}),u=()=>r||(r=(async()=>{if(o({stage:`loading-script`,message:`Downloading Python runtime…`}),await l(`${n}pyodide.js`),!window.loadPyodide)throw Error(`Pyodide loader not available`);o({stage:`starting-runtime`,message:`Starting Python runtime…`});let e=await window.loadPyodide({indexURL:n});return o({stage:`installing-packages`,message:`Installing fontTools & brotli…`}),await e.loadPackage([`micropip`]),await e.runPythonAsync(`
import micropip
await micropip.install(['fonttools', 'brotli'])
		`),o({stage:`ready`,message:`Python tools ready`}),e})().catch(e=>{throw r=null,o({stage:`error`,message:e instanceof Error?e.message:String(e)}),e}),r),d=async e=>{let t=await u();t.FS.writeFile(`/tmp/in.otf`,new Uint8Array(e)),await t.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.otf')
font.flavor = 'woff2'
font.save('/tmp/out.woff2')
	`);let n=t.FS.readFile(`/tmp/out.woff2`),r=new ArrayBuffer(n.byteLength);return new Uint8Array(r).set(n),r},f=async(e,t)=>{let n=await u();n.FS.writeFile(`/tmp/in.otf`,new Uint8Array(e));let r=t.flavor??null;t.layoutFeatures;let i=JSON.stringify(t.text??``),a=JSON.stringify(t.unicodes??``),o=r?`'${r}'`:`None`;await n.runPythonAsync(`
from fontTools.subset import Subsetter, load_font, save_font, parse_unicodes, Options
opts = Options()
opts.layout_features = ['*']
opts.flavor = ${o}
font = load_font('/tmp/in.otf', opts)
text = ${i}
unicodes_str = ${a}
unis = list(text) if text else []
codes = []
for ch in unis:
    codes.append(ord(ch))
if unicodes_str:
    codes.extend(parse_unicodes(unicodes_str))
sub = Subsetter(options=opts)
sub.populate(unicodes=codes if codes else list(range(0x0020, 0x024F)))
sub.subset(font)
save_font(font, '/tmp/out.bin', opts)
	`);let s=n.FS.readFile(`/tmp/out.bin`),c=new ArrayBuffer(s.byteLength);return new Uint8Array(c).set(s),c},p=async(e,t)=>{let n=await u();n.FS.writeFile(`/tmp/in.otf`,new Uint8Array(e)),n.FS.writeFile(`/tmp/features.fea`,t),await n.runPythonAsync(`
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeatures
font = TTFont('/tmp/in.otf')
addOpenTypeFeatures(font, '/tmp/features.fea')
font.save('/tmp/out.otf')
	`);let r=n.FS.readFile(`/tmp/out.otf`),i=new ArrayBuffer(r.byteLength);return new Uint8Array(i).set(r),i},m=async(e,t)=>{if(!t.feaSource&&!t.verticalMetrics)return e;let n=await u();n.FS.writeFile(`/tmp/in.otf`,new Uint8Array(e)),t.feaSource&&n.FS.writeFile(`/tmp/features.fea`,t.feaSource);let r=t.verticalMetrics,i=r?`
font["OS/2"].sTypoAscender = ${r.typoAscender}
font["OS/2"].sTypoDescender = ${r.typoDescender}
font["OS/2"].sTypoLineGap = ${r.typoLineGap}
font["OS/2"].usWinAscent = ${r.winAscent}
font["OS/2"].usWinDescent = ${r.winDescent}
font["hhea"].ascent = ${r.hheaAscender}
font["hhea"].descent = ${r.hheaDescender}
font["hhea"].lineGap = ${r.hheaLineGap}
sel = font["OS/2"].fsSelection
sel = (sel | 0x80) if ${r.useTypoMetrics?`True`:`False`} else (sel & ~0x80)
font["OS/2"].fsSelection = sel
`:``,a=t.feaSource?`
from fontTools.feaLib.builder import addOpenTypeFeatures
addOpenTypeFeatures(font, '/tmp/features.fea')
`:``;await n.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.otf')
${a}
${i}
font.save('/tmp/out.otf')
	`);let o=n.FS.readFile(`/tmp/out.otf`),s=new ArrayBuffer(o.byteLength);return new Uint8Array(s).set(o),s},h=async e=>{let t=await u(),n=[];for(let r=0;r<e.masters.length;r++){let i=`/tmp/master_${r}.otf`;t.FS.writeFile(i,new Uint8Array(e.masters[r].buffer)),n.push(i)}let r={axes:e.axes,masters:e.masters.map((e,t)=>({name:e.name,file:n[t],location:e.location})),defaultName:e.defaultMasterName,instances:e.instances,familyName:e.familyName};t.FS.writeFile(`/tmp/designspace.json`,JSON.stringify(r)),await t.runPythonAsync(`
import json, re, zipfile, os
from fontTools.designspaceLib import (
    DesignSpaceDocument, AxisDescriptor, SourceDescriptor, InstanceDescriptor
)
from fontTools.ttLib import TTFont
from fontTools.varLib import build
from fontTools.varLib.instancer import instantiateVariableFont
try:
    from fontTools.varLib.varLib_build_HVAR import build as build_HVAR
except ImportError:
    # Newer fontTools exposes HVAR.build via a different module path. Fall back
    # to the canonical entry point; if that's also unavailable, varLib.build
    # already produces a usable VF without HVAR.
    try:
        from fontTools.varLib import HVAR as _HVAR
        build_HVAR = _HVAR.build
    except Exception:
        build_HVAR = None

with open('/tmp/designspace.json') as f:
    spec = json.load(f)

doc = DesignSpaceDocument()
for ax in spec['axes']:
    a = AxisDescriptor()
    a.tag = ax['tag']
    a.name = ax['name']
    a.minimum = ax['minimum']
    a.default = ax['default']
    a.maximum = ax['maximum']
    doc.addAxis(a)

axis_name_for_tag = { ax['tag']: ax['name'] for ax in spec['axes'] }

for m in spec['masters']:
    s = SourceDescriptor()
    s.name = m['name']
    s.font = TTFont(m['file'])
    s.location = { axis_name_for_tag[k]: v for k, v in m['location'].items() if k in axis_name_for_tag }
    doc.addSource(s)

vf, _, _ = build(doc)

# Add HVAR (horizontal-metrics variation) so that browsers + cached pipelines
# get stable, exact advance widths at intermediate axis positions instead of
# wobble from interpolation. Silently skip if fontTools doesn't expose it.
if build_HVAR is not None:
    try:
        build_HVAR(vf)
    except Exception as _err:
        print(f"HVAR build skipped: {_err}")

def safe(name):
    return re.sub(r'[^A-Za-z0-9-]+', '', name) or 'Style'

family_safe = safe(spec['familyName'])
out_zip = '/tmp/family.zip'
if os.path.exists(out_zip):
    os.remove(out_zip)

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for inst in spec.get('instances') or []:
        # Translate tag-keyed location into the fvar tag space
        location = { k: v for k, v in inst['location'].items() if k in axis_name_for_tag }
        static = instantiateVariableFont(vf, location, inplace=False)
        # Update the name table with the style-specific name
        style = inst['styleName']
        try:
            name = static['name']
            name.setName(spec['familyName'], 1, 3, 1, 0x409)  # familyName
            name.setName(style, 2, 3, 1, 0x409)  # subfamilyName
            name.setName(f"{spec['familyName']} {style}", 4, 3, 1, 0x409)  # fullName
            name.setName(inst.get('postScriptName') or f"{family_safe}-{safe(style)}", 6, 3, 1, 0x409)
        except Exception as e:
            print('name table update skipped:', e)
        fname = f"{family_safe}-{safe(style)}.ttf"
        tmp_path = f'/tmp/inst_{safe(style)}.ttf'
        static.save(tmp_path)
        zf.write(tmp_path, fname)
	`);let i=t.FS.readFile(`/tmp/family.zip`),a=new ArrayBuffer(i.byteLength);return new Uint8Array(a).set(i),a},g=async e=>{let t=await u(),n=[];for(let r=0;r<e.masters.length;r++){let i=`/tmp/master_${r}.otf`;t.FS.writeFile(i,new Uint8Array(e.masters[r].buffer)),n.push(i)}let r={axes:e.axes,masters:e.masters.map((e,t)=>({name:e.name,file:n[t],location:e.location})),defaultName:e.defaultMasterName,instances:e.instances??[]};t.FS.writeFile(`/tmp/designspace.json`,JSON.stringify(r)),await t.runPythonAsync(`
import json
from fontTools.designspaceLib import (
    DesignSpaceDocument, AxisDescriptor, SourceDescriptor, InstanceDescriptor
)
from fontTools.ttLib import TTFont
from fontTools.varLib import build
from fontTools.otlLib.builder import buildStatTable
try:
    from fontTools.varLib import HVAR as _HVAR
    build_HVAR = _HVAR.build
except Exception:
    build_HVAR = None

with open('/tmp/designspace.json') as f:
    spec = json.load(f)

doc = DesignSpaceDocument()
for ax in spec['axes']:
    a = AxisDescriptor()
    a.tag = ax['tag']
    a.name = ax['name']
    a.minimum = ax['minimum']
    a.default = ax['default']
    a.maximum = ax['maximum']
    doc.addAxis(a)

axis_name_for_tag = { ax['tag']: ax['name'] for ax in spec['axes'] }

for m in spec['masters']:
    s = SourceDescriptor()
    s.name = m['name']
    s.font = TTFont(m['file'])
    s.location = { axis_name_for_tag[k]: v for k, v in m['location'].items() if k in axis_name_for_tag }
    doc.addSource(s)

for inst in spec.get('instances') or []:
    i = InstanceDescriptor()
    i.familyName = inst.get('familyName')
    i.styleName = inst.get('styleName')
    if inst.get('postScriptName'):
        i.postScriptName = inst['postScriptName']
    i.location = { axis_name_for_tag[k]: v for k, v in inst['location'].items() if k in axis_name_for_tag }
    doc.addInstance(i)

vf, _, _ = build(doc)

# Add HVAR — exact advance widths at intermediate axis positions for browsers
# and cached rendering pipelines. Silently skip if unavailable.
if build_HVAR is not None:
    try:
        build_HVAR(vf)
    except Exception as _err:
        print(f"HVAR build skipped: {_err}")

# Auto-generate a STAT table from the instances. STAT tells the OS which
# axis values correspond to which named styles ("400 = Regular", etc.).
# Without this, OS font menus often misclassify the styles.
instances = spec.get('instances') or []
if instances and spec['axes']:
    # Build axis value records: one per unique value used by any instance,
    # plus the axis default if not already covered.
    stat_axes = []
    for ax in spec['axes']:
        tag = ax['tag']
        values_by_value = {}
        for inst in instances:
            if tag in inst['location']:
                v = inst['location'][tag]
                # Name from the instance's styleName when only this axis is non-default;
                # otherwise just fall back to the numeric value.
                only_this_axis_non_default = all(
                    other_tag == tag or inst['location'].get(other_tag, ax2['default']) == ax2['default']
                    for ax2 in spec['axes']
                    for other_tag in [ax2['tag']]
                )
                if v not in values_by_value:
                    values_by_value[v] = inst['styleName'] if only_this_axis_non_default else str(v)
        if ax['default'] not in values_by_value:
            values_by_value[ax['default']] = 'Regular'
        values = []
        for v in sorted(values_by_value.keys()):
            entry = {'value': v, 'name': values_by_value[v]}
            if v == ax['default']:
                entry['flags'] = 2  # ElidableAxisValueName — OS hides this from compound names
            values.append(entry)
        stat_axes.append({'tag': tag, 'name': ax['name'], 'values': values})
    try:
        buildStatTable(vf, stat_axes)
    except Exception as e:
        # STAT build is best-effort — keep the VF even if STAT details fail
        print('STAT build skipped:', e)

vf.save('/tmp/vf.ttf')
	`);let i=t.FS.readFile(`/tmp/vf.ttf`),a=new ArrayBuffer(i.byteLength);return new Uint8Array(a).set(i),a},_=async(e,t)=>{let n=await u();n.FS.writeFile(`/tmp/project.json`,e),n.FS.writeFile(`/tmp/family.txt`,t),await n.runPythonAsync(y);let r=n.FS.readFile(`/tmp/out.zip`),i=new ArrayBuffer(r.byteLength);return new Uint8Array(i).set(r),i},v=async e=>{let t=await u();t.FS.writeFile(`/tmp/in.zip`,new Uint8Array(e)),await t.runPythonAsync(b);let n=t.FS.readFile(`/tmp/project.json`);return new TextDecoder().decode(n)},y=`
import json, os, plistlib, re, shutil, zipfile

with open('/tmp/project.json') as f:
    project = json.load(f)
with open('/tmp/family.txt') as f:
    family = f.read().strip() or 'Untitled'

# Sanitize a name for a directory
def safe(s):
    return re.sub(r'[^A-Za-z0-9_-]+', '-', s).strip('-') or 'Untitled'

ufo_dir = f'/tmp/{safe(family)}.ufo'
if os.path.exists(ufo_dir):
    shutil.rmtree(ufo_dir)
os.makedirs(ufo_dir)
glyphs_dir = os.path.join(ufo_dir, 'glyphs')
os.makedirs(glyphs_dir)

# metainfo.plist
metainfo = { 'creator': 'org.fontstudio.app', 'formatVersion': 3 }
with open(os.path.join(ufo_dir, 'metainfo.plist'), 'wb') as f:
    plistlib.dump(metainfo, f)

# fontinfo.plist
m = project.get('metrics', {})
meta = project.get('metadata', {})
fontinfo = {
    'familyName': meta.get('familyName', family),
    'styleName': meta.get('styleName', 'Regular'),
    'versionMajor': 1,
    'versionMinor': 0,
    'copyright': meta.get('copyright', ''),
    'openTypeNameDesigner': meta.get('designer', ''),
    'openTypeNameLicense': meta.get('license', ''),
    'unitsPerEm': m.get('unitsPerEm', 1000),
    'ascender': m.get('ascender', 800),
    'descender': m.get('descender', -200),
    'capHeight': m.get('capHeight', 700),
    'xHeight': m.get('xHeight', 500),
}
with open(os.path.join(ufo_dir, 'fontinfo.plist'), 'wb') as f:
    plistlib.dump(fontinfo, f)

# .glif name disambiguation for case-insensitive FS: uppercase letters use suffix '_'
def glif_filename(name):
    # Simple variant of the UFO spec mangling
    out = []
    for ch in name:
        if ch.isupper():
            out.append(ch + '_')
        elif ch.isalnum() or ch in '-_':
            out.append(ch)
        else:
            out.append('_')
    return ''.join(out) + '.glif'

contents = {}
glyphs_by_cp = project.get('glyphs', {})

def write_glif(name, glyph):
    contour_commands = glyph.get('contours', [])
    components = glyph.get('components') or []
    fname = glif_filename(name)
    contents[name] = fname
    el_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    el_lines.append(f'<glyph name="{name}" format="2">')
    if glyph.get('codepoint'):
        cp = int(glyph['codepoint'])
        if cp > 0:
            el_lines.append(f'  <unicode hex="{cp:04X}"/>')
    el_lines.append(f'  <advance width="{int(glyph.get("advanceWidth", 0))}"/>')
    if contour_commands or components:
        el_lines.append('  <outline>')
        for comp in components:
            base_cp = int(comp.get('baseCodepoint', 0))
            base_glyph = glyphs_by_cp.get(str(base_cp))
            if base_glyph:
                el_lines.append(f'    <component base="{base_glyph.get("name", "uni" + format(base_cp, "04X"))}" xOffset="{int(comp.get("offsetX", 0))}" yOffset="{int(comp.get("offsetY", 0))}"/>')
        for contour in contour_commands:
            cmds = contour.get('commands', [])
            if not cmds:
                continue
            el_lines.append('    <contour>')
            # Convert path commands to UFO point list
            i = 0
            n = len(cmds)
            while i < n:
                c = cmds[i]
                t = c.get('type')
                if t == 'M':
                    el_lines.append(f'      <point x="{int(c["x"])}" y="{int(c["y"])}" type="line"/>')
                elif t == 'L':
                    el_lines.append(f'      <point x="{int(c["x"])}" y="{int(c["y"])}" type="line"/>')
                elif t == 'C':
                    # Two off-curve handles, then on-curve point at end
                    el_lines.append(f'      <point x="{int(c["x1"])}" y="{int(c["y1"])}"/>')
                    el_lines.append(f'      <point x="{int(c["x2"])}" y="{int(c["y2"])}"/>')
                    el_lines.append(f'      <point x="{int(c["x"])}" y="{int(c["y"])}" type="curve"/>')
                elif t == 'Q':
                    el_lines.append(f'      <point x="{int(c["x1"])}" y="{int(c["y1"])}"/>')
                    el_lines.append(f'      <point x="{int(c["x"])}" y="{int(c["y"])}" type="qcurve"/>')
                # Z is implicit (UFO contours are always closed)
                i += 1
            el_lines.append('    </contour>')
        el_lines.append('  </outline>')
    el_lines.append('</glyph>')
    with open(os.path.join(glyphs_dir, fname), 'w') as f:
        f.write('\\n'.join(el_lines))

for cp, glyph in glyphs_by_cp.items():
    write_glif(glyph.get('name', 'uni' + format(int(cp), '04X')), glyph)

with open(os.path.join(glyphs_dir, 'contents.plist'), 'wb') as f:
    plistlib.dump(contents, f)

# kerning.plist (flat pairs only — class kerning would need groups too)
kerning = {}
for pair in project.get('kerning', []) or []:
    left_g = glyphs_by_cp.get(str(pair['left']))
    right_g = glyphs_by_cp.get(str(pair['right']))
    if not left_g or not right_g:
        continue
    l = left_g.get('name')
    r = right_g.get('name')
    if l and r:
        kerning.setdefault(l, {})[r] = pair['value']
if kerning:
    with open(os.path.join(ufo_dir, 'kerning.plist'), 'wb') as f:
        plistlib.dump(kerning, f)

# Zip the .ufo directory
zip_path = '/tmp/out.zip'
if os.path.exists(zip_path):
    os.remove(zip_path)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(ufo_dir):
        for name in files:
            full = os.path.join(root, name)
            arc = os.path.relpath(full, '/tmp')
            zf.write(full, arc)
`,b=`
import json, os, plistlib, re, shutil, zipfile, xml.etree.ElementTree as ET

# Extract
extract_dir = '/tmp/ufo-in'
if os.path.exists(extract_dir):
    shutil.rmtree(extract_dir)
os.makedirs(extract_dir)
with zipfile.ZipFile('/tmp/in.zip', 'r') as zf:
    zf.extractall(extract_dir)

# Find the .ufo directory
ufo_dir = None
for entry in os.listdir(extract_dir):
    p = os.path.join(extract_dir, entry)
    if os.path.isdir(p) and entry.endswith('.ufo'):
        ufo_dir = p
        break
    elif os.path.isdir(p):
        # Maybe the .ufo is nested
        for sub in os.listdir(p):
            sp = os.path.join(p, sub)
            if os.path.isdir(sp) and sub.endswith('.ufo'):
                ufo_dir = sp
                break
if not ufo_dir:
    # Maybe zip contents ARE the UFO (no enclosing dir)
    if os.path.exists(os.path.join(extract_dir, 'metainfo.plist')):
        ufo_dir = extract_dir

if not ufo_dir:
    raise RuntimeError('Could not find .ufo directory in zip')

def read_plist(path):
    if not os.path.exists(path):
        return {}
    with open(path, 'rb') as f:
        return plistlib.load(f)

metainfo = read_plist(os.path.join(ufo_dir, 'metainfo.plist'))
fontinfo = read_plist(os.path.join(ufo_dir, 'fontinfo.plist'))
contents = read_plist(os.path.join(ufo_dir, 'glyphs', 'contents.plist'))
kerning_plist = read_plist(os.path.join(ufo_dir, 'kerning.plist'))

# Build project dict
project = {
    'metadata': {
        'familyName': fontinfo.get('familyName', 'Untitled'),
        'styleName': fontinfo.get('styleName', 'Regular'),
        'designer': fontinfo.get('openTypeNameDesigner', ''),
        'copyright': fontinfo.get('copyright', ''),
        'license': fontinfo.get('openTypeNameLicense', ''),
        'version': str(fontinfo.get('versionMajor', 1)) + '.' + str(fontinfo.get('versionMinor', 0)).zfill(3),
    },
    'metrics': {
        'unitsPerEm': fontinfo.get('unitsPerEm', 1000),
        'ascender': fontinfo.get('ascender', 800),
        'descender': fontinfo.get('descender', -200),
        'capHeight': fontinfo.get('capHeight', 700),
        'xHeight': fontinfo.get('xHeight', 500),
        'defaultSidebearing': 50,
    },
    'glyphs': {},
    'kerning': [],
    'features': {'kern': True, 'liga': False},
}

# Read glyphs
def parse_glif(path):
    tree = ET.parse(path)
    root = tree.getroot()
    name = root.get('name')
    cp = 0
    advance = 0
    contours = []
    components = []
    for uel in root.findall('unicode'):
        hex_val = uel.get('hex')
        if hex_val:
            try:
                cp = int(hex_val, 16)
            except ValueError:
                pass
            break
    for adv in root.findall('advance'):
        try:
            advance = int(float(adv.get('width', 0)))
        except (TypeError, ValueError):
            advance = 0
    outline = root.find('outline')
    if outline is not None:
        for component in outline.findall('component'):
            components.append({
                'baseCodepoint': 0,  # filled in after we have the name->cp map
                'baseName': component.get('base'),
                'offsetX': int(float(component.get('xOffset', 0))),
                'offsetY': int(float(component.get('yOffset', 0))),
            })
        for contour in outline.findall('contour'):
            pts = list(contour.findall('point'))
            if not pts:
                continue
            commands = []
            # UFO contour can start at any point; if first is off-curve we rotate
            # to find the first on-curve to anchor the M.
            first_on = next((i for i, p in enumerate(pts) if p.get('type') in ('line', 'curve', 'qcurve', 'move')), 0)
            ordered = pts[first_on:] + pts[:first_on]
            # M from the first on-curve
            first = ordered[0]
            commands.append({'type': 'M', 'x': int(float(first.get('x'))), 'y': int(float(first.get('y')))})
            i = 1
            n = len(ordered)
            while i < n:
                p = ordered[i]
                t = p.get('type')
                if t in (None, ''):
                    # Off-curve handle for next curve segment
                    if i + 2 < n:
                        h1 = p
                        h2 = ordered[i+1]
                        end = ordered[i+2]
                        if end.get('type') == 'curve':
                            commands.append({
                                'type': 'C',
                                'x1': int(float(h1.get('x'))), 'y1': int(float(h1.get('y'))),
                                'x2': int(float(h2.get('x'))), 'y2': int(float(h2.get('y'))),
                                'x': int(float(end.get('x'))), 'y': int(float(end.get('y'))),
                            })
                            i += 3
                            continue
                    elif i + 1 < n:
                        h1 = p
                        end = ordered[i+1]
                        if end.get('type') == 'qcurve':
                            commands.append({
                                'type': 'Q',
                                'x1': int(float(h1.get('x'))), 'y1': int(float(h1.get('y'))),
                                'x': int(float(end.get('x'))), 'y': int(float(end.get('y'))),
                            })
                            i += 2
                            continue
                    i += 1
                elif t == 'line':
                    commands.append({'type': 'L', 'x': int(float(p.get('x'))), 'y': int(float(p.get('y')))})
                    i += 1
                elif t == 'curve':
                    # standalone curve point (rare without preceding off-curves) — treat as line
                    commands.append({'type': 'L', 'x': int(float(p.get('x'))), 'y': int(float(p.get('y')))})
                    i += 1
                elif t == 'qcurve':
                    commands.append({'type': 'L', 'x': int(float(p.get('x'))), 'y': int(float(p.get('y')))})
                    i += 1
                else:
                    i += 1
            commands.append({'type': 'Z'})
            contours.append({'closed': True, 'winding': 'ccw', 'commands': commands})
    return name, cp, advance, contours, components

name_to_cp = {}
for name, fname in contents.items():
    path = os.path.join(ufo_dir, 'glyphs', fname)
    if not os.path.exists(path):
        continue
    parsed_name, cp, adv, contours, components = parse_glif(path)
    pname = parsed_name or name
    name_to_cp[pname] = cp if cp > 0 else None
    glyph = {
        'codepoint': cp,
        'name': pname,
        'status': 'final' if contours else 'empty',
        'advanceWidth': adv,
        'leftSidebearing': 50,
        'rightSidebearing': 50,
        'contours': contours,
        'updatedAt': '',
    }
    if components:
        glyph['components'] = components
    if cp > 0:
        project['glyphs'][cp] = glyph

# Fix up component baseCodepoint references using baseName
for cp, glyph in project['glyphs'].items():
    comps = glyph.get('components') or []
    for c in comps:
        base_name = c.pop('baseName', None)
        if base_name and base_name in name_to_cp and name_to_cp[base_name]:
            c['baseCodepoint'] = name_to_cp[base_name]

# Kerning (flat plist form only — class kerning would need groups.plist)
for left_name, rights in (kerning_plist or {}).items():
    left_cp = name_to_cp.get(left_name)
    if not left_cp:
        continue
    for right_name, value in rights.items():
        right_cp = name_to_cp.get(right_name)
        if not right_cp:
            continue
        project['kerning'].append({
            'left': left_cp,
            'right': right_cp,
            'value': int(value),
        })

with open('/tmp/project.json', 'w') as f:
    json.dump(project, f)
`;export{c as a,_ as c,v as d,m as i,t as l,p as n,h as o,u as r,d as s,g as t,s as u};