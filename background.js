const browser = window.browser || window.chrome;

let sites = [];
let proxy = {
  host: "127.0.0.1",
  port: 8080,
  username: "",
  password: ""
};
let enabled = false;

// ====== Загрузка настроек ======
browser.storage.local.get(["sites", "proxy", "enabled"]).then((data) => {
  if (data.sites) sites = data.sites;
  if (data.proxy) proxy = data.proxy;
  enabled = !!data.enabled;
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.sites) sites = changes.sites.newValue || [];
  if (changes.proxy) proxy = changes.proxy.newValue || proxy;
  if (changes.enabled) enabled = !!changes.enabled.newValue;
});

// ====== Проверка домена ======
function shouldProxy(host) {
  if (!enabled) return false;
  const clean = host.replace(/^www\./, "").toLowerCase();

  // Локальные адреса никогда не проксируем
  if (
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.endsWith(".local") ||
    clean.endsWith(".onion")
  ) {
    return false;
  }

  return sites.some((s) => {
    const site = s.replace(/^www\./, "").toLowerCase();
    return clean === site || clean.endsWith("." + site);
  });
}

// ====== Главный обработчик ======
browser.proxy.onRequest.addListener(
  (request) => {
    let host;
    try {
      host = new URL(request.url).hostname;
    } catch (e) {
      return { type: "direct" };
    }

    const useProxy = shouldProxy(host);

    // Отладка — смотри в about:debugging → Inspect
    console.log(
      `[proxy] ${useProxy ? "PROXY" : "direct"} ${request.url}`
    );

    if (!useProxy) {
      return { type: "direct" };
    }

    const proxyInfo = {
      type: "http",     // Squid — HTTP-прокси, HTTPS идёт через CONNECT
      host: proxy.host,
      port: parseInt(proxy.port, 10)
    };

    if (proxy.username) {
      proxyInfo.username = proxy.username;
      proxyInfo.password = proxy.password;
    }

    return proxyInfo;
  },
  { urls: ["<all_urls>"] }
);

browser.proxy.onError.addListener((error) => {
  console.error("[proxy error]", error.message);
});
