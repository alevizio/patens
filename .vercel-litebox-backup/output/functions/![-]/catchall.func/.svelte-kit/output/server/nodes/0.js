

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.D_FsMx0Z.js","_app/immutable/chunks/DHw-IyYA.js","_app/immutable/chunks/BGiSaRlg.js","_app/immutable/chunks/CejoeAUc.js","_app/immutable/chunks/BxIHShdD.js","_app/immutable/chunks/2TU3FloQ.js","_app/immutable/chunks/WXQgvonq.js","_app/immutable/chunks/CRfEvN0p.js","_app/immutable/chunks/CZpBLXd7.js","_app/immutable/chunks/CyoWzouY.js","_app/immutable/chunks/OE7KEsOE.js"];
export const stylesheets = ["_app/immutable/assets/0.CE8klj19.css"];
export const fonts = [];
