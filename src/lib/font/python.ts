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

/** Subset a font to a given character set via pyftsubset. */
export const subsetFont = async (
	otfBuffer: ArrayBuffer,
	options: {
		text?: string;
		unicodes?: string;
		flavor?: 'woff2' | 'woff' | null;
		layoutFeatures?: string;
	}
): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/in.otf', new Uint8Array(otfBuffer));
	const flavor = options.flavor ?? null;
	const layoutFeatures = options.layoutFeatures ?? '*';
	const text = JSON.stringify(options.text ?? '');
	const unicodes = JSON.stringify(options.unicodes ?? '');
	const flavorPy = flavor ? `'${flavor}'` : 'None';
	await py.runPythonAsync(`
from fontTools.subset import Subsetter, load_font, save_font, parse_unicodes, Options
opts = Options()
opts.layout_features = ['*']
opts.flavor = ${flavorPy}
font = load_font('/tmp/in.otf', opts)
text = ${text}
unicodes_str = ${unicodes}
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
	`);
	const out = py.FS.readFile('/tmp/out.bin');
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

/**
 * Export the project as a UFO 3 directory bundled into a ZIP. Generated using
 * a small custom writer because we don't need defcon — straight plist + XML.
 */
export const projectToUfoZip = async (projectJson: string, familyName: string): Promise<ArrayBuffer> => {
	const py = await ensurePython();
	py.FS.writeFile('/tmp/project.json', projectJson);
	py.FS.writeFile('/tmp/family.txt', familyName);
	await py.runPythonAsync(UFO_EXPORT_PY);
	const out = py.FS.readFile('/tmp/out.zip');
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

const UFO_EXPORT_PY = `
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
`;

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

