import { el } from "../ui/dom.js";
import { getAdminSettings, updateAdminSettings } from "../apiClient.js";
import { loadSession } from "../storage.js";
import { panelGateway } from "./settings/panelGateway.js";
import { panelShift } from "./settings/panelShift.js";
import { panelRetention } from "./settings/panelRetention.js";
import { panelAlerts } from "./settings/panelAlerts.js";
import { panelSlack } from "./settings/panelSlack.js";
import { buildPatchFromDom } from "./settings/patchDom.js";

export function renderSettings(state, rerender) {
  const session = loadSession();
  const cached = state.adminSettingsCache || null;
  const shift = cached?.shift || {
    tzOffsetMinutes: 300,
    start: "19:00",
    end: "04:30",
  };
  const retention = cached?.retention || {
    rawSnapshotsDays: 14,
    bucketsDays: 60,
    alertsDays: 30,
  };
  const alerts = cached?.alerts || {
    waitingSpikeMax: 25,
    waitingSpikeSustainSeconds: 120,
    waitingSpikeCooldownSeconds: 600,
    purpleOverloadMin: 8,
    purpleOverloadSustainSeconds: 180,
    purpleOverloadCooldownSeconds: 900,
    dropPercentJumpPoints: 2.5,
    dropPercentMin: 3,
    dropPercentCooldownSeconds: 900,
    notifyToast: true,
    notifySound: false,
  };
  const notifications = cached?.notifications || {
    slack: {
      enabled: false,
      webhookUrl: "",
      channel: "",
      username: "Vici Monitor Pro",
      cooldownSeconds: 300,
      routes: {
        info: { enabled: false, webhookUrl: "", channel: "" },
        warn: { enabled: true, webhookUrl: "", channel: "" },
        bad: { enabled: true, webhookUrl: "", channel: "" },
      },
    },
  };

  const tab = state.settingsTab || "gateway";
  const setTab = (t) => {
    state.settingsTab = t;
    rerender();
  };

  const tabs = el("div", { class: "tabs" }, [
    tabBtn("gateway", "Gateway URL", tab, setTab),
    tabBtn("shift", "Shift", tab, setTab),
    tabBtn("retention", "Retention", tab, setTab),
    tabBtn("alerts", "Alerts", tab, setTab),
    tabBtn("notifications", "Notifications", tab, setTab),
  ]);

  const section = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Settings"]),
    el("div", { class: "note" }, [
      "Use tabs to manage gateway configuration cleanly.",
    ]),
    tabs,
    el("div", { id: "st_panel" }, [
      renderPanel(tab, {
        state,
        session,
        shift,
        retention,
        alerts,
        notifications,
        rerender,
      }),
    ]),
    el("div", { class: "actions" }, [
      el(
        "button",
        {
          class: "btn",
          onclick: async () => {
            const msg = document.getElementById("st_admin_msg");
            msg.textContent = "Loading…";
            const r = await getAdminSettings(state.baseUrl, state.token);
            if (!r.success) {
              msg.textContent = `Failed: ${r.error}`;
              return;
            }
            state.adminSettingsCache = r.settings || {};
            msg.textContent = "Loaded.";
            rerender();
          },
        },
        ["Load from gateway"],
      ),
      el(
        "button",
        {
          class: "btn primary",
          onclick: async () => {
            const msg = document.getElementById("st_admin_msg");
            msg.textContent = "Saving…";
            const patch = buildPatchFromDom();
            const r = await updateAdminSettings(
              state.baseUrl,
              state.token,
              patch,
            );
            if (!r.success) {
              msg.textContent = `Failed: ${r.error}`;
              return;
            }
            state.adminSettingsCache = r.settings || {};
            msg.textContent = "Saved to gateway.";
            rerender();
          },
        },
        ["Save to gateway"],
      ),
    ]),
    el("div", { id: "st_admin_msg", class: "msg" }, [""]),
  ]);

  // checkbox defaults
  setTimeout(() => {
    const t = document.getElementById("st_al_toast");
    const s = document.getElementById("st_al_sound");
    if (t) t.checked = !!alerts.notifyToast;
    if (s) s.checked = !!alerts.notifySound;
    const se = document.getElementById("st_slack_enabled");
    if (se) se.checked = !!notifications.slack?.enabled;
    const sb = document.getElementById("st_slack_bad_enabled");
    const sw = document.getElementById("st_slack_warn_enabled");
    const si = document.getElementById("st_slack_info_enabled");
    if (sb) sb.checked = !!notifications.slack?.routes?.bad?.enabled;
    if (sw) sw.checked = !!notifications.slack?.routes?.warn?.enabled;
    if (si) si.checked = !!notifications.slack?.routes?.info?.enabled;
  }, 0);

  return section;
}

function tabBtn(key, label, active, setTab) {
  return el(
    "button",
    {
      type: "button",
      class: `tabBtn ${active === key ? "active" : ""}`,
      onclick: () => setTab(key),
    },
    [label],
  );
}

function renderPanel(tab, ctx) {
  if (tab === "gateway") return panelGateway(ctx);
  if (tab === "shift") return panelShift(ctx);
  if (tab === "retention") return panelRetention(ctx);
  if (tab === "alerts") return panelAlerts(ctx);
  if (tab === "notifications") return panelSlack(ctx);
  return el("div", {}, ["Unknown tab"]);
}
