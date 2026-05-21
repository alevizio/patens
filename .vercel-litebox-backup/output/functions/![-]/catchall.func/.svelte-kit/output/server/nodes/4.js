

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/families/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false,
  "load": null
};
export const universal_id = "src/routes/families/+page.ts";
export const imports = ["_app/immutable/nodes/4.PExMZ1Yz.js","_app/immutable/chunks/DHw-IyYA.js","_app/immutable/chunks/CefhFQgK2.js","_app/immutable/chunks/CejoeAUc.js","_app/immutable/chunks/BxIHShdD.js","_app/immutable/chunks/2TU3FloQ.js","_app/immutable/chunks/t3GLyDdE2.js","_app/immutable/chunks/CjholbZm.js","_app/immutable/chunks/DvxIlYzW.js","_app/immutable/chunks/CyoWzouY.js","_app/immutable/chunks/CjGH23qt.js","_app/immutable/chunks/CBlMoEI0.js"];
export const stylesheets = [];
export const fonts = [];
