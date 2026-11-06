/* The app on your own domain: the web layer (install, phone push alerts, location, the site's server) plugs in
   before the app starts. */
import {HOST} from "./core/host.js";
import {WEBAPP} from "./web/webapp.js";
import {start} from "./ui/main.js";

HOST.web = WEBAPP;
start();
