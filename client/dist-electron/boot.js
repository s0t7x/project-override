import u from "electron";
import c from "path";
import f from "url";
function d(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var i = {}, a;
function m() {
  if (a) return i;
  a = 1;
  const { app: e, BrowserWindow: t, Menu: s } = u, o = c, r = f;
  function n() {
    process.env.NODE_ENV !== "development" && s.setApplicationMenu(!1);
    const l = new t({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: !0,
        // Keep false for security
        contextIsolation: !1,
        // Keep true for security
        webSecurity: !1
        // Keep true for security
      }
    }), p = process.env.NODE_ENV === "development" ? r.format({
      pathname: o.join(__dirname, "public", "index.html"),
      // Adjust if your dev server is different
      protocol: "file:",
      slashes: !0
    }) : r.format({
      pathname: o.join(__dirname, "index.html"),
      // Adjust if your build output is different
      protocol: "file:",
      slashes: !0
    });
    l.loadURL(p);
  }
  return e.whenReady().then(() => {
    n(), e.on("activate", () => {
      t.getAllWindows().length === 0 && n();
    });
  }), e.on("window-all-closed", () => {
    process.platform !== "darwin" && e.quit();
  }), i;
}
var h = m();
const b = /* @__PURE__ */ d(h);
export {
  b as default
};
