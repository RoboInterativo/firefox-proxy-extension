# Selective Proxy

A Firefox extension that routes **only chosen websites** through a proxy, leaving all other traffic direct. Useful when you need a proxy for a few services rather than your entire browser.

## Why

Standard browser or system proxy settings are all-or-nothing. If you need a proxy for just `example.com` and `api.service.io` while everything else should connect directly, you either write a PAC file or live with global proxying.

This extension solves it with `browser.proxy.onRequest` — a Firefox API that lets you decide per-request, in real time, whether to use a proxy.

## Features

- **Selective proxying** — a list of domains that go through the proxy
- **Subdomains included automatically** — add `example.com` and `api.example.com` is covered
- **No PAC scripts** — all logic in JavaScript, configured from the popup
- **HTTP, HTTPS, SOCKS4, SOCKS5** — any proxy type
- **Proxy authentication** — username and password
- **Remote DNS for SOCKS** — resolve hostnames on the proxy side
- **Instant apply** — changes take effect immediately, no browser restart
- **Safe by default** — `localhost`, `127.0.0.1`, `.local`, and `.onion` always connect directly
- **Console logging** — see which request went where, for debugging

## Installation

### Temporary (for development)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json` from the project folder
4. The extension icon appears in the toolbar

Temporary add-ons are removed when Firefox restarts.

### Permanent

Requires signing through [addons.mozilla.org](https://addons.mozilla.org/developers/), or Firefox Developer Edition / Nightly with `xpinstall.signatures.required` set to `false` in `about:config`.

## Usage

1. Click the extension icon in the toolbar
2. Enable the proxy with the checkbox
3. Enter your proxy host and port (e.g. `127.0.0.1:8080`)
4. Choose the proxy type — `HTTP` for Squid, mitmproxy, 3proxy, or most HTTP proxies
5. Optionally add a username and password if your proxy requires authentication
6. Add the domains you want proxied, one per line:

```
example.com
api.service.io
internal.corp
```

7. Click **Save**

From that point, requests to those domains (and their subdomains) go through the proxy. Everything else connects directly.

### How domain matching works

| Entry in list | Matches | Does not match |
|---|---|---|
| `example.com` | `example.com`, `www.example.com`, `api.example.com` | `notexample.com` |
| `api.service.io` | `api.service.io`, `v2.api.service.io` | `service.io` |

`www.` is stripped from both the list entry and the request host before comparison, so `www.example.com` and `example.com` are treated as the same.

## Configuration

### Proxy types

- **HTTP** — standard HTTP proxy. HTTPS requests go through a `CONNECT` tunnel. This is what Squid, mitmproxy, tinyproxy, and 3proxy use by default.
- **HTTPS** — a proxy you connect to over TLS. Rare; not the same as "proxying HTTPS sites".
- **SOCKS4** — SOCKS4 proxy.
- **SOCKS5** — SOCKS5 proxy. Enable *Resolve DNS through proxy* if you want the proxy to resolve hostnames instead of Firefox.

### Authentication

Firefox's `browser.proxy.onRequest` accepts `username` and `password`, but **does not reliably apply them for HTTPS requests via `CONNECT`** — a long-standing limitation ([Bugzilla #1553262](https://bugzilla.mozilla.org/show_bug.cgi?id=1553262)). For HTTPS sites, Firefox will prompt for credentials and, if you tick *Remember*, store them in the password manager as `moz-proxy://host:port`.

For a smoother experience with authentication:

- Let Firefox save the credentials once via the dialog, or
- Run a local unauthenticated proxy (e.g. `tinyproxy` or `3proxy`) in front of the authenticated upstream, and point the extension at the local one.

## How it works

The extension registers a `browser.proxy.onRequest` listener. For each request:

1. The hostname is extracted from the URL.
2. If the proxy is disabled, or the host is a local address, or the host is not in the list — `{ type: "direct" }` is returned.
3. Otherwise, a proxy info object is returned for the configured proxy.

Firefox calls this listener for every HTTP and HTTPS request, so the decision is per-request and takes effect immediately. No PAC file, no browser restart.

`browser.proxy.onError` is also registered to surface proxy errors in the extension console.

## Debugging

### Extension console

Open `about:debugging#/runtime/this-firefox`, find the extension, click **Inspect**, and switch to the **Console** tab. You will see one line per request:

```
[proxy] PROXY  https://example.com/
[proxy] DIRECT https://wikipedia.org/
```

Filter by `PROXY` or `DIRECT` to narrow it down.

### Firefox networking

- `about:networking#sockets` — active TCP connections. Proxied requests connect to your proxy host and port; direct requests connect to the site's IP.
- `about:networking#dns` — DNS lookups. Proxied HTTPS requests do not trigger local DNS resolution.

### Squid access log

If you use Squid, its access log is the ground truth:

```bash
sudo tail -f /var/log/squid/access.log
```

A proxied HTTPS request appears as:

```
1700000000.123  200  192.168.1.5  TCP_TUNNEL/200  5123  CONNECT example.com:443 - HIER_DIRECT/93.184.216.34 -
```

If a non-listed site leaves no entry in the log, it went direct — which is the desired behaviour.

### Common pitfalls

- **HTTP/3 (QUIC)** may bypass an HTTP proxy. Set `network.http.http3.enable` to `false` in `about:config` for testing.
- **DNS over HTTPS** can bypass the proxy for DNS. Set it to *Off* in `about:preferences#privacy` if needed.
- **Service workers** can serve cached responses without touching the network, so the proxy is not involved. Clear site data when testing.
- **Other proxy extensions** (FoxyProxy, SwitchyOmega, VPNs) may also register `proxy.onRequest` and conflict. Disable them while testing.

## Limitations

- The `username` and `password` fields in `proxy.onRequest` are not honoured for HTTPS `CONNECT` requests by Firefox. See *Authentication* above.
- HTTP/3 traffic over UDP may not go through an HTTP proxy that only handles TCP.
- Proxy credentials are stored in `browser.storage.local` in plain text. Do not use this extension with credentials you would not store locally.

## File structure

```
selective-proxy/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
└── icons/
    └── icon48.png
```

## License

MIT
