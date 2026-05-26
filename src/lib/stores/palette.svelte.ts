/**
 * Shared command-palette state — lets the root layout mount one
 * <CommandPalette> instance while letting any nested route (e.g.
 * /project/[id] for the `/` shortcut) open it. A single source of
 * truth avoids the two-palettes-on-screen race that would otherwise
 * happen with independent $state flags.
 */
class PaletteStore {
	open = $state(false);
	show() {
		this.open = true;
	}
	hide() {
		this.open = false;
	}
	toggle() {
		this.open = !this.open;
	}
}

export const palette = new PaletteStore();
