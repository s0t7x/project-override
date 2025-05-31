import f from "electron";
import p from "path";
import w from "url";
function h(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var l = {}, i;
function m() {
  if (i) return l;
  i = 1;
  const { app: e, BrowserWindow: o, Menu: b } = f, c = p, u = w;
  let r = !1;
  const d = async (t) => {
    const n = new o();
    t.webContents.setDevToolsWebContents(n.webContents), t.webContents.openDevTools({ mode: "detach" });
    const a = await e.getGPUInfo("basic");
    console.log(e.getGPUFeatureStatus(), a);
  };
  function s() {
    try {
      require("steamworks.js").electronEnableSteamOverlay();
    } catch {
      if (process.env.NODE_ENV !== "development") return;
      console.log("Cannot connect to steam");
    }
    const t = new o({
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
    }), n = process.env.NODE_ENV === "development" ? "http://localhost:3000" : u.format({
      pathname: c.join(__dirname, "index.html"),
      // Adjust if your build output is different
      protocol: "file:",
      slashes: !0
    });
    t.loadURL(n), d(t), r = !0;
  }
  return e.whenReady().then(() => {
    r || (o.getAllWindows().length === 0 && s(), e.on("activate", () => {
      o.getAllWindows().length === 0 && s();
    }));
  }), e.on("window-all-closed", () => {
    process.platform !== "darwin" && e.quit();
  }), l;
}
var v = m();
const C = /* @__PURE__ */ h(v);
export {
  C as default
};
