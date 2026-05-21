

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/family/_id_/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false,
  "load": null
};
export const universal_id = "src/routes/family/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/5.CYwj3ONy.js","_app/immutable/chunks/DHw-IyYA.js","_app/immutable/chunks/CTZG090x.js","_app/immutable/chunks/1bYSqsDY.js","_app/immutable/chunks/BxIHShdD.js","_app/immutable/chunks/CyoWzouY.js","_app/immutable/chunks/CejoeAUc.js","_app/immutable/chunks/2TU3FloQ.js","_app/immutable/chunks/CefhFQgK2.js","_app/immutable/chunks/BGiSaRlg.js","_app/immutable/chunks/x3-TPFsl2.js","_app/immutable/chunks/WXQgvonq.js","_app/immutable/chunks/t3GLyDdE2.js","_app/immutable/chunks/JGZXe9Xm.js","_app/immutable/chunks/D15o161T2.js","_app/immutable/chunks/CA71hrqg.js","_app/immutable/chunks/CiF0C3OB.js","_app/immutable/chunks/DEOfNwOe.js","_app/immutable/chunks/CjGH23qt.js","_app/immutable/chunks/C33G6PvQ.js","_app/immutable/chunks/ClqkWttd.js","_app/immutable/chunks/Bg-YHvnR.js","_app/immutable/chunks/DvxIlYzW.js","_app/immutable/chunks/OE7KEsOE.js","_app/immutable/chunks/B90SMbaj.js","_app/immutable/chunks/BTtIFzLT.js"];
export const stylesheets = [];
export const fonts = [];
