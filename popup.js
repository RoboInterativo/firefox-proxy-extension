const browser = window.browser || window.chrome;
const $ = (id) => document.getElementById(id);

browser.storage.local.get(["sites", "proxy", "enabled"]).then((data) => {
  $("enabled").checked = !!data.enabled;
  if (data.proxy) {
    $("host").value = data.proxy.host || "";
    $("port").value = data.proxy.port || "";
    $("username").value = data.proxy.username || "";
    $("password").value = data.proxy.password || "";
  }
  if (data.sites) $("sites").value = data.sites.join("\n");
});

$("save").addEventListener("click", async () => {
  const sites = $("sites").value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const proxy = {
    host: $("host").value.trim(),
    port: parseInt($("port").value, 10),
    username: $("username").value.trim(),
    password: $("password").value
  };

  const enabled = $("enabled").checked;

  if (enabled && (!proxy.host || !proxy.port)) {
    setStatus("⚠ Укажите хост и порт", "#c33");
    return;
  }

  await browser.storage.local.set({ sites, proxy, enabled });
  setStatus("Сохранено ✓", "#2a7");
});

$("test").addEventListener("click", async () => {
  const host = $("host").value.trim();
  const port = parseInt($("port").value, 10);

  if (!host || !port) {
    setStatus("⚠ Укажите хост и порт", "#c33");
    return;
  }

  setStatus("Проверяю…", "#666");

  try {
    // Проверяем и HTTP, и HTTPS
    const testUrls = [
      "http://api.ipify.org?format=json",
      "https://api.ipify.org?format=json"
    ];

    const results = [];
    for (const url of testUrls) {
      try {
        const resp = await fetch(url);
        const data = await resp.json();
        results.push(`${url.split(":")[0]}: ${data.ip}`);
      } catch (e) {
        results.push(`${url.split(":")[0]}: ошибка (${e.message})`);
      }
    }

    setStatus(results.join(" | "), "#2a7");
  } catch (e) {
    setStatus("Ошибка: " + e.message, "#c33");
  }
});

function setStatus(text, color) {
  const el = $("status");
  el.textContent = text;
  el.style.color = color || "#2a7";
}
