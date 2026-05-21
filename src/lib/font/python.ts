/**
 * Lazy Pyodide + fontTools loader.
 *
 * Pyodide is ~10MB compressed and only needed for advanced operations
 * (WOFF2 export, .fea compilation, UFO read/write, varLib). We load it
 * on first use, cache the instance, and surface progress for the UI.
 */

const PYODIDE_VERSION = '0.29.4';
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

declare global {
	interface Window {
		loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideRuntime>;
	}
}

type PyodideRuntime = {
	loadPackage: (name: string | string[]) => Promise<void>;
	runPythonAsync: (code: string) => Promise<unknown>;
	FS: {
		writeFile(path: string, data: Uint8Array | string): void;
		readFile(path: string): Uint8Array;
		mkdir(path: string): void;
		readdir(path: string): string[];
		analyzePath(path: string): { exists: boolean };
	};
};

type LoaderProgress = {
	stage: 'idle' | 'loading-script' | 'starting-runtime' | 'installing-packages' | 'ready' | 'error';
	message: string;
};

let pyodidePromise: Promise<PyodideRuntime> | null = null;
const subscribers = new Set<(p: LoaderProgress) => void>();
let lastProgress: LoaderProgress = { stage: 'idle', message: 'Not loaded' };

const setProgress = (p: LoaderProgress) => {
	lastProgress = p;
	for (const fn of subscribers) fn(p);
};

export const subscribeToPython = (fn: (p: LoaderProgress) => void): (() => void) => {
	subscribers.add(fn);
	fn(lastProgress);
	return () => subscribers.delete(fn);
};

export const getPythonProgress = (): LoaderProgress => lastProgress;

const loadScriptOnce = (src: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const existing = document.querySelector(`script[data-src="${src}"]`);
		if (existing) {
			if ((existing as HTMLScriptElement).dataset.loaded === '1') return resolve();
			existing.addEventListener('load', () => resolve());
			existing.addEventListener('error', reject);
			return;
		}
		const s = document.createElement('script');
		s.src = src;
		s.dataset.src = src;
		s.async = true;
		s.onload = () => {
			s.dataset.loaded = '1';
			resolve();
		};
		s.onerror = () => reject(new Error(`Failed to load ${src}`));
		document.head.appendChild(s);
	});

/** Lazy-load Pyodide with fontTools + brotli (cached for the page lifetime). */
export const ensurePython = (): Promise<PyodideRuntime> => {
	if (pyodidePromise) return pyodidePromise;
	pyodidePromise = (async () => {
		setProgress({ stage: 'loading-script', message: 'Downloading Python runtime…' });
		await loadScriptOnce(`${CDN_BASE}pyodide.js`);
		if (!window.loadPyodide) throw new Error('Pyodide loader not available');

		setProgress({ stage: 'starting-runtime', message: 'Starting Python runtime…' });
		const py = await window.loadPyodide({ indexURL: CDN_BASE });

		setProgress({ stage: 'installing-packages', message: 'Installing fontTools & brotli…' });
		await py.loadPackage(['micropip']);
		await py.runPythonAsync(`
import micropip
await micropip.install(['fonttools', 'brotli'])
		`);

		setProgress({ stage: 'ready', message: 'Python tools ready' });
		return py;
	})().catch((err) => {
		pyodidePromise = null; // allow retry
		setProgress({
			stage: 'error',
			message: err instanceof Error ? err.message : String(err)
		});
		throw err;
	});
	return pyodidePromise;
};

/** Convert OTF/TTF buffer to WOFF2 via fontTools. */
export const otfToWoff2 = async (otfBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.otf', new Uint8Array(otfBuffer));
	await py.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.otf')
font.flavor = 'woff2'
font.save('/tmp/out.woff2')
	`);
	const out = py.FS.readFile('/tmp/out.woff2');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

/** Compile an .fea source against a font, returning a new binary with the features baked in. */
export const compileFeaIntoFont = async (
	otfBuffer: ArrayBuffer,
	feaSource: string
): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.otf', new Uint8Array(otfBuffer));
	py.FS.writeFile('/tmp/features.fea', feaSource);
	await py.runPythonAsync(`
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeatures
font = TTFont('/tmp/in.otf')
addOpenTypeFeatures(font, '/tmp/features.fea')
font.save('/tmp/out.otf')
	`);
	const out = py.FS.readFile('/tmp/out.otf');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

export type FinalizeOpts = {
	/** Optional .fea source to compile in */
	feaSource?: string;
	/** Vertical metrics to write into OS/2 + hhea */
	verticalMetrics?: {
		typoAscender: number;
		typoDescender: number;
		typoLineGap: number;
		hheaAscender: number;
		hheaDescender: number;
		hheaLineGap: number;
		winAscent: number;
		winDescent: number;
		useTypoMetrics: boolean;
	};
};

/**
 * One-pass post-processing in Python: compile .fea (if given) and apply
 * vertical metrics (if given). Avoids two round-trips through Pyodide's FS.
 */
export const finalizeFont = async (
	otfBuffer: ArrayBuffer,
	opts: FinalizeOpts
): Promise<ArrayBuffer> => {
	if (!opts.feaSource && !opts.verticalMetrics) return otfBuffer;
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.otf', new Uint8Array(otfBuffer));
	if (opts.feaSource) py.FS.writeFile('/tmp/features.fea', opts.feaSource);

	const vm = opts.verticalMetrics;
	const vmStmts = vm
		? `
font["OS/2"].sTypoAscender = ${vm.typoAscender}
font["OS/2"].sTypoDescender = ${vm.typoDescender}
font["OS/2"].sTypoLineGap = ${vm.typoLineGap}
font["OS/2"].usWinAscent = ${vm.winAscent}
font["OS/2"].usWinDescent = ${vm.winDescent}
font["hhea"].ascent = ${vm.hheaAscender}
font["hhea"].descent = ${vm.hheaDescender}
font["hhea"].lineGap = ${vm.hheaLineGap}
sel = font["OS/2"].fsSelection
sel = (sel | 0x80) if ${vm.useTypoMetrics ? 'True' : 'False'} else (sel & ~0x80)
font["OS/2"].fsSelection = sel
`
		: '';
	const feaStmts = opts.feaSource
		? `
from fontTools.feaLib.builder import addOpenTypeFeatures
addOpenTypeFeatures(font, '/tmp/features.fea')
`
		: '';

	await py.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.otf')
${feaStmts}
${vmStmts}
font.save('/tmp/out.otf')
	`);
	const out = py.FS.readFile('/tmp/out.otf');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

/**
 * Convert an OTF/CFF buffer to a TTF/glyf buffer by converting cubic
 * outlines to quadratic via Cu2Qu. Required step before TrueType
 * auto-hinting (`ttfautohint` only operates on TT outlines + the glyf
 * table). The conversion is lossy in the strict mathematical sense but
 * imperceptible at body sizes; max-err of 1 EM unit is the de-facto
 * standard (Glyphs / FontLab use the same).
 */
export const compileStaticTtf = async (otfBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.otf', new Uint8Array(otfBuffer));
	await py.runPythonAsync(`
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

font = TTFont('/tmp/in.otf')
assert font.sfntVersion == 'OTTO', 'Expected CFF/OTF input'

glyph_order = font.getGlyphOrder()
glyph_set = font.getGlyphSet()

glyf = newTable('glyf')
glyf.glyphOrder = glyph_order
glyf.glyphs = {}
for name in glyph_order:
    pen = TTGlyphPen(None)
    cu2qu = Cu2QuPen(pen, max_err=1.0, reverse_direction=True)
    glyph_set[name].draw(cu2qu)
    glyf.glyphs[name] = pen.glyph()

# Swap CFF outlines for glyf/loca + bump sfntVersion to TTF
for tag in ('CFF ', 'CFF2', 'VORG'):
    if tag in font:
        del font[tag]
font['glyf'] = glyf
font['loca'] = newTable('loca')
font.sfntVersion = '\\x00\\x01\\x00\\x00'

# maxp v1.0 (TT format) — fields auto-compute on save
maxp = font['maxp']
maxp.tableVersion = 0x00010000
maxp.numGlyphs = len(glyph_order)
for attr in (
    'maxPoints', 'maxContours', 'maxCompositePoints', 'maxCompositeContours',
    'maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs',
    'maxInstructionDefs', 'maxStackElements', 'maxSizeOfInstructions',
    'maxComponentElements', 'maxComponentDepth'
):
    setattr(maxp, attr, 0)
maxp.maxZones = 1

# post format 2.0 carries glyph names; 3.0 doesn't. Keep names if present.
if 'post' in font and font['post'].formatType not in (2.0, 3.0):
    font['post'].formatType = 2.0

# gasp v1 — tells the OS how to render this font at every PPM. The modern
# recommendation (Google Fonts default, what ttfautohint emits) is "do
# everything": gridfit + grayscale + symmetric smoothing + symmetric
# gridfit. Without an explicit gasp the OS falls back to heuristic
# defaults that may not match the design intent.
#   GASP_GRIDFIT             = 0x0001
#   GASP_DOGRAY              = 0x0002
#   GASP_SYMMETRIC_GRIDFIT   = 0x0004
#   GASP_SYMMETRIC_SMOOTHING = 0x0008
gasp = newTable('gasp')
gasp.version = 1
gasp.gaspRange = {0xFFFF: 0x000F}
font['gasp'] = gasp

font.save('/tmp/out.ttf')
	`);
	const out = py.FS.readFile('/tmp/out.ttf');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

/**
 * Build a variable font, then instantiate each named instance as a static
 * TTF, zip them together, and return the zip buffer. Used by Export →
 * "Export instances as a static family".
 */
export const instancesAsStaticZip = async (input: {
	axes: Array<{ tag: string; name: string; minimum: number; default: number; maximum: number }>;
	masters: Array<{ name: string; buffer: ArrayBuffer; location: Record<string, number> }>;
	defaultMasterName: string;
	familyName: string;
	instances: Array<{
		familyName?: string;
		styleName: string;
		location: Record<string, number>;
		postScriptName?: string;
	}>;
}): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	const fileNames: string[] = [];
	for (let i = 0; i < input.masters.length; i++) {
		const fname = `/tmp/master_${i}.otf`;
		py.FS.writeFile(fname, new Uint8Array(input.masters[i].buffer));
		fileNames.push(fname);
	}
	const payload = {
		axes: input.axes,
		masters: input.masters.map((m, i) => ({
			name: m.name,
			file: fileNames[i],
			location: m.location
		})),
		defaultName: input.defaultMasterName,
		instances: input.instances,
		familyName: input.familyName
	};
	py.FS.writeFile('/tmp/designspace.json', JSON.stringify(payload));
	await py.runPythonAsync(`
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
	`);
	const out = py.FS.readFile('/tmp/family.zip');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

/**
 * Build a variable font from a designspace of master OTFs.
 * Each master is supplied as `{ buffer, location }`; `axes` defines the fvar
 * range. Optional named `instances` are baked into fvar so OS font menus
 * can list them as selectable styles.
 */
export const buildVariableFont = async (input: {
	axes: Array<{ tag: string; name: string; minimum: number; default: number; maximum: number }>;
	masters: Array<{ name: string; buffer: ArrayBuffer; location: Record<string, number> }>;
	defaultMasterName: string;
	instances?: Array<{
		familyName?: string;
		styleName: string;
		location: Record<string, number>;
		postScriptName?: string;
	}>;
}): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	const fileNames: string[] = [];
	for (let i = 0; i < input.masters.length; i++) {
		const fname = `/tmp/master_${i}.otf`;
		py.FS.writeFile(fname, new Uint8Array(input.masters[i].buffer));
		fileNames.push(fname);
	}
	const payload = {
		axes: input.axes,
		masters: input.masters.map((m, i) => ({
			name: m.name,
			file: fileNames[i],
			location: m.location
		})),
		defaultName: input.defaultMasterName,
		instances: input.instances ?? []
	};
	py.FS.writeFile('/tmp/designspace.json', JSON.stringify(payload));
	await py.runPythonAsync(`
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
    # Convention from the Microsoft Typography sample data + Glyphs / Inter:
    # ital → slnt → wght → wdth → opsz, registered axes first, custom axes
    # after. The 'ordering' field in each axis record is what STAT v1.2 uses
    # to drive instance grouping in OS font menus (so a wght+wdth family
    # reads "Bold Condensed", not "Condensed Bold").
    AXIS_ORDER = {'ital': 0, 'slnt': 1, 'wght': 2, 'wdth': 3, 'opsz': 4}
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
        # 'ordering' is the v1.2 STAT field — fontTools writes table version
        # 0x00010002 when any axis carries it. Registered axes get their
        # canonical order; custom axes sort after by tag offset.
        ordering = AXIS_ORDER.get(tag, 100 + ord(tag[0]))
        stat_axes.append({
            'tag': tag,
            'name': ax['name'],
            'ordering': ordering,
            'values': values
        })
    try:
        # elidedFallbackName = nameID 2 (style sub-family) is the recommended
        # default — when an instance's combined name elides all values, fall
        # back to "Regular" from the existing name table.
        buildStatTable(vf, stat_axes, elidedFallbackName=2)
    except Exception as e:
        # STAT build is best-effort — keep the VF even if STAT details fail
        print('STAT build skipped:', e)

vf.save('/tmp/vf.ttf')
	`);
	const out = py.FS.readFile('/tmp/vf.ttf');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

/** Read a UFO ZIP (or .ufo dir packed into a zip) and return a Project JSON string. */
export const ufoZipToProject = async (zipBuffer: ArrayBuffer): Promise<string> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.zip', new Uint8Array(zipBuffer));
	await py.runPythonAsync(UFO_IMPORT_PY);
	const out = py.FS.readFile('/tmp/project.json');
	return new TextDecoder().decode(out);
};

const UFO_IMPORT_PY = `
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
`;

