/**
 * Designspace v5 import tests.
 *
 * Test fixture is a minimal 2-axis designspace inspired by Inter v4's
 * shape (wght 100-900, wdth 75-100, 3 sources + 5 named instances).
 */

import { describe, it, expect } from 'vitest';
import { parseDesignspaceXml, designspaceToProject } from './designspace';

// happy-dom provides DOMParser in vitest's node env
import { Window } from 'happy-dom';
const window = new Window();
// @ts-expect-error — happy-dom DOMParser shimmed into globalThis for the test
globalThis.DOMParser = window.DOMParser;

const MINIMAL_DESIGNSPACE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<designspace format="5.0">
  <axes>
    <axis tag="wght" name="Weight" minimum="100" default="400" maximum="900"/>
    <axis tag="wdth" name="Width" minimum="75" default="100" maximum="100"/>
  </axes>
  <sources>
    <source filename="thin.ufo" familyname="Inter" name="Inter Thin">
      <location>
        <dimension name="wght" xvalue="100"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </source>
    <source filename="regular.ufo" familyname="Inter" name="Inter Regular">
      <location>
        <dimension name="wght" xvalue="400"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </source>
    <source filename="black.ufo" familyname="Inter" name="Inter Black">
      <location>
        <dimension name="wght" xvalue="900"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </source>
  </sources>
  <instances>
    <instance familyname="Inter" stylename="Thin" postscriptfontname="Inter-Thin">
      <location>
        <dimension name="wght" xvalue="100"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </instance>
    <instance familyname="Inter" stylename="Light" postscriptfontname="Inter-Light">
      <location>
        <dimension name="wght" xvalue="300"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </instance>
    <instance familyname="Inter" stylename="Regular" postscriptfontname="Inter-Regular">
      <location>
        <dimension name="wght" xvalue="400"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </instance>
    <instance familyname="Inter" stylename="Bold" postscriptfontname="Inter-Bold">
      <location>
        <dimension name="wght" xvalue="700"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </instance>
    <instance familyname="Inter" stylename="Black" postscriptfontname="Inter-Black">
      <location>
        <dimension name="wght" xvalue="900"/>
        <dimension name="wdth" xvalue="100"/>
      </location>
    </instance>
  </instances>
</designspace>`;

describe('parseDesignspaceXml', () => {
	it('parses axes correctly', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		expect(ds.axes).toHaveLength(2);
		expect(ds.axes[0].tag).toBe('wght');
		expect(ds.axes[0].name).toBe('Weight');
		expect(ds.axes[0].minimum).toBe(100);
		expect(ds.axes[0].default).toBe(400);
		expect(ds.axes[0].maximum).toBe(900);
		expect(ds.axes[1].tag).toBe('wdth');
	});

	it('parses sources with correct locations', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		expect(ds.sources).toHaveLength(3);
		const thin = ds.sources.find((s) => s.name === 'Inter Thin');
		expect(thin?.location.wght).toBe(100);
		expect(thin?.location.wdth).toBe(100);
		expect(thin?.filename).toBe('thin.ufo');
	});

	it('parses instances with familyname + stylename + postscriptfontname', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		expect(ds.instances).toHaveLength(5);
		const bold = ds.instances.find((i) => i.styleName === 'Bold');
		expect(bold?.familyName).toBe('Inter');
		expect(bold?.postScriptName).toBe('Inter-Bold');
		expect(bold?.location.wght).toBe(700);
	});

	it('throws on malformed XML', () => {
		expect(() => parseDesignspaceXml('<not-valid-xml')).toThrow();
	});

	it('throws on missing axes', () => {
		const noAxes = `<?xml version="1.0"?><designspace format="5.0"><axes></axes></designspace>`;
		expect(() => parseDesignspaceXml(noAxes)).toThrow(/no <axes>/);
	});

	it('throws on invalid axis tag length', () => {
		const badTag = `<?xml version="1.0"?><designspace format="5.0"><axes><axis tag="wgt" name="Bad" minimum="0" default="0" maximum="0"/></axes></designspace>`;
		expect(() => parseDesignspaceXml(badTag)).toThrow(/4 chars/);
	});

	it('throws on min/default/max out of order', () => {
		const badRange = `<?xml version="1.0"?><designspace format="5.0"><axes><axis tag="wght" name="Weight" minimum="900" default="400" maximum="100"/></axes></designspace>`;
		expect(() => parseDesignspaceXml(badRange)).toThrow(/out of order/);
	});
});

describe('designspaceToProject', () => {
	it('maps axes to Patens Axis[] format', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		expect(project.axes).toHaveLength(2);
		expect(project.axes![0].tag).toBe('wght');
	});

	it('identifies the default source and excludes it from masters', () => {
		// The default source is at wght=400 + wdth=100 (the axis defaults)
		// Inter Regular matches that → should NOT be in masters
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		expect(project.masters).toHaveLength(2); // Thin + Black, not Regular
		expect(project.masters!.every((m) => m.name !== 'Inter Regular')).toBe(true);
	});

	it('preserves the default master glyph map empty (user imports separately)', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		// Patens's default master = project.glyphs (not in masters[]). It's
		// the caller's responsibility to populate glyphs from the UFO of
		// the default source. We just leave glyphs unset in the partial.
		expect(project.glyphs).toBeUndefined();
	});

	it('preserves all instances with locations', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		expect(project.instances).toHaveLength(5);
		const bold = project.instances!.find((i) => i.styleName === 'Bold');
		expect(bold?.location.wght).toBe(700);
		expect(bold?.postScriptName).toBe('Inter-Bold');
	});

	it('merges with existing project metadata', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const existing = { id: 'existing', name: 'My Font' } as Partial<unknown> as Parameters<
			typeof designspaceToProject
		>[1];
		const project = designspaceToProject(ds, existing);
		expect(project.id).toBe('existing');
		expect(project.name).toBe('My Font');
		expect(project.axes).toHaveLength(2);
	});

	it('returns masters with generated stable IDs', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		expect(project.masters![0].id).toBe('imported-1');
		expect(project.masters![1].id).toBe('imported-2');
	});

	it('returns instances with generated stable IDs', () => {
		const ds = parseDesignspaceXml(MINIMAL_DESIGNSPACE_XML);
		const project = designspaceToProject(ds);
		expect(project.instances![0].id).toBe('imported-instance-1');
		expect(project.instances![4].id).toBe('imported-instance-5');
	});
});
