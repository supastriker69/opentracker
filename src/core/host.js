/* Where the app is running. On claude.ai nothing is plugged in. On your own domain the web app's entry
   (src/app-web.js) plugs in its web layer (src/web/webapp.js): installing on the home screen, phone push alerts,
   "use my location", and data from the site's own server. Everything else asks HOST.web before using it. */
export const HOST = {web: null};
