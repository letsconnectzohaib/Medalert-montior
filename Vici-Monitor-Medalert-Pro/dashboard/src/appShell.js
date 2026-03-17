import { loadSession, saveSession, clearSession, savePage } from "./storage.js";
import {
  login as apiLogin,
  pingGateway,
  normalizeBaseUrl,
} from "./apiClient.js";
import {
  PAGE_GROUPS,
  getDefaultPage,
  getPageMeta,
  isKnownPage,
} from "./config/navigation.js";
import { renderOverview, patchOverviewDom } from "./pages/overview.js";
import { renderShiftAnalytics } from "./pages/shiftAnalytics.js";
import { renderReports } from "./pages/reports.js";
import { renderAlerts } from "./pages/alerts.js";
import { renderSettings } from "./pages/settings.js";
import { renderAdvancedDb } from "./pages/advancedDb.js";
import { renderIntelligence } from "./pages/intelligence.js";
import { el } from "./ui/dom.js";
import {
  setBadge,
  createBrandBlock,
  createSidebar,
  createTopStatusBadges,
  createPageHeader,
  createShellLayout,
  createToastHost,
  createSidebarFooter,
  updateSidebarActive,
  updateGatewayText,
} from "./ui/shell.js";
import {
  createDomState,
  createInitialState,
  createRuntimeHelpers,
} from "./app/runtime.js";

function getPageIdFromHash() {
  const raw = String(window.location.hash || "")
    .replace(/^#/, "")
    .trim();
  return isKnownPage(raw) ? raw : null;
}

function getPageMetaSafe(pageId) {
  return (
    getPageMeta(pageId) ||
    getPageMeta(getDefaultPage()) || {
      id: getDefaultPage(),
      label: "Dashboard",
      description: "",
    }
  );
}

function createLoginCard(root, state, onSignedIn) {
  return (async () => {
    const gatewayOk = await pingGateway(state.baseUrl);
    const card = el("div", { class: "loginCard" }, [
      el("div", { class: "loginTitle" }, ["Sign in"]),
      el("div", { class: "loginSub" }, [
        "Login to view live operations, intelligence, and reporting.",
      ]),
      el("div", { class: "hr" }, []),
      el("div", { class: "loginGrid" }, [
        el("label", {}, ["Gateway URL"]),
        el("input", { id: "lg_gateway", value: state.baseUrl }),
      ]),
      el("div", { class: "loginGrid" }, [
        el("label", {}, ["Username"]),
        el("input", { id: "lg_user", value: "admin" }),
      ]),
      el("div", { class: "loginGrid" }, [
        el("label", {}, ["Password"]),
        el("input", { id: "lg_pass", type: "password", value: "admin123" }),
      ]),
      el("div", { class: "actions" }, [
        el(
          "button",
          {
            class: "btn primary",
            onclick: async () => {
              const baseUrl = normalizeBaseUrl(
                root.querySelector("#lg_gateway")?.value,
              );
              const username = root.querySelector("#lg_user")?.value?.trim();
              const password = root.querySelector("#lg_pass")?.value;
              const msg = root.querySelector("#lg_msg");
              if (msg) msg.textContent = "";
              state.baseUrl = baseUrl;
              const res = await apiLogin(baseUrl, username, password);
              if (!res.success) {
                if (msg) msg.textContent = res.error || "Login failed.";
                return;
              }
              saveSession({
                gatewayUrl: baseUrl,
                token: res.token,
                user: res.user,
              });
              await onSignedIn({ baseUrl, token: res.token, user: res.user });
            },
          },
          ["Sign in"],
        ),
        el(
          "button",
          { class: "btn", onclick: () => window.location.reload() },
          ["Reload"],
        ),
      ]),
      el("div", { id: "lg_msg", class: "msg" }, [
        gatewayOk ? "" : "Gateway is offline/unreachable.",
      ]),
    ]);
    return el("div", { class: "loginWrap" }, [card]);
  })();
}

export function createApp(root) {
  const state = createInitialState();
  const dom = createDomState();

  function beep(kind = "warn") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "bad" ? 660 : 440;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 140);
    } catch {
      // ignore audio errors
    }
  }

  function toast(text, kind = "warn") {
    const host = dom.shell?.querySelector("#toastHost");
    if (!host) return;
    const node = el("div", { class: `toast ${kind}` }, [text]);
    host.appendChild(node);
    setTimeout(() => node.classList.add("show"), 10);
    setTimeout(() => {
      node.classList.remove("show");
      setTimeout(() => node.remove(), 250);
    }, 3500);
  }

  function updateBadges() {
    if (!dom.badges) return;
    dom.badges.innerHTML = "";
    setBadge(
      dom.badges,
      "auth",
      "good",
      `Auth: ${state.user?.username || "signed in"}`,
    );
    setBadge(
      dom.badges,
      "ws",
      state.wsStatus === "connected"
        ? "good"
        : state.wsStatus === "unauthorized"
          ? "bad"
          : "warn",
      `WS: ${state.wsStatus}`,
    );
    setBadge(
      dom.badges,
      "snap",
      state.latestSnapshot ? "good" : "warn",
      `Last snapshot: ${state.latestSnapshot?.timestamp || "—"}`,
    );
  }

  function updateHeaderMeta() {
    const meta = getPageMetaSafe(state.page);
    if (dom.pageTitle) dom.pageTitle.textContent = meta.label || "Dashboard";
    if (dom.pageDesc) dom.pageDesc.textContent = meta.description || "";
    if (dom.pageEyebrow) {
      dom.pageEyebrow.textContent = `${meta.groupIcon || "•"} ${meta.groupLabel || "Dashboard"}`;
    }
  }

  function updateNavActive() {
    if (!dom.sidebar) return;
    updateSidebarActive(dom.sidebar, state.page);
    updateGatewayText(dom.sidebar, state.baseUrl);
    updateHeaderMeta();
  }

  function ensureShell(runtime) {
    if (dom.shell) return;

    dom.badges = createTopStatusBadges();

    const brand = createBrandBlock({
      title: "Vicidial Monitor Pro",
      subtitle: "Realtime ops intelligence",
      accent: "VM",
    });

    const footer = createSidebarFooter({
      gatewayText: state.baseUrl,
      userText: state.user?.username || "",
      onLogout: runtime.logout,
    });

    dom.sidebar = createSidebar(PAGE_GROUPS, {
      activePage: state.page,
      brand,
      footerChildren: footer,
      onNavigate: (pageId) => runtime.setPage(pageId),
    });

    dom.pageEyebrow = el("div", { class: "pageEyebrow" }, [""]);
    dom.pageTitle = el("div", { class: "pageTitle" }, ["Dashboard"]);
    dom.pageDesc = el("div", { class: "pageDesc" }, [""]);
    dom.pageContainer = el("div", { id: "page_container" }, []);
    const toastHost = createToastHost();

    const header = createPageHeader({
      title: "Dashboard",
      description: "",
      eyebrow: "",
      badgesNode: dom.badges,
    });

    const layout = createShellLayout({
      sidebar: dom.sidebar,
      header,
      pageContainer: dom.pageContainer,
      toastHost,
    });

    dom.shell = layout.shell;
    root.replaceChildren(dom.shell);
    updateHeaderMeta();
    updateNavActive();
    updateBadges();
  }

  function renderPage(runtime) {
    ensureShell(runtime);
    updateNavActive();

    dom.pageContainer.replaceChildren();

    if (state.hardReloadWarning) {
      dom.pageContainer.appendChild(
        el("section", { class: "card wide" }, [
          el("div", { class: "cardTitle" }, ["Reload warning"]),
          el("div", { class: "note" }, [state.hardReloadWarning]),
          el("div", { class: "note" }, [
            "If you are using a live-reload server or an auto-refresh browser extension, disable it for the dashboard to avoid hard refresh loops.",
          ]),
        ]),
      );
    }

    if (state.page === "overview")
      dom.pageContainer.appendChild(renderOverview(state));
    if (state.page === "shift")
      dom.pageContainer.appendChild(renderShiftAnalytics(state));
    if (state.page === "intelligence")
      dom.pageContainer.appendChild(renderIntelligence(state));
    if (state.page === "reports")
      dom.pageContainer.appendChild(renderReports(state));
    if (state.page === "alerts")
      dom.pageContainer.appendChild(renderAlerts(state));
    if (state.page === "settings") {
      dom.pageContainer.appendChild(
        renderSettings(state, () => {
          runtime.connectWs();
          renderPage(runtime);
          updateBadges();
          updateNavActive();
        }),
      );
    }
    if (state.page === "advanced")
      dom.pageContainer.appendChild(renderAdvancedDb(state));
  }

  function render(runtime) {
    if (!state.token) {
      createLoginCard(root, state, async ({ baseUrl, token, user }) => {
        state.baseUrl = normalizeBaseUrl(baseUrl);
        state.token = token;
        state.user = user;
        runtime.persistLogin({ baseUrl, token, user });
        runtime.connectWs();
        render(runtime);
      }).then((loginNode) => {
        root.replaceChildren(loginNode);
      });
      return;
    }

    renderPage(runtime);
    updateBadges();
  }

  const runtime = createRuntimeHelpers({
    state,
    render: () => render(runtime),
    renderPage: () => renderPage(runtime),
    updateBadges,
    updateNavActive,
    patchOverviewDom,
    toast,
    beep,
  });

  window.addEventListener("hashchange", () => {
    const nextPage = getPageIdFromHash();
    if (nextPage && nextPage !== state.page) {
      state.page = nextPage;
      savePage(nextPage);
      renderPage(runtime);
      updateBadges();
      updateNavActive();
    }
  });

  runtime.restore().then(() => {
    const restored = isKnownPage(state.page) ? state.page : getDefaultPage();
    history.replaceState(null, "", `#${restored}`);
    state.page = restored;
    render(runtime);
  });
}
