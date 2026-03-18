/**
 * dom.js — shared DOM utility for Vicidial Monitor Pro dashboard
 *
 * All pages import from here instead of defining their own el().
 */

/** Core element factory */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue; // skip null/undefined
    if (k === "class") {
      node.className = v;
    } else if (k === "checked") {
      node.checked = !!v;
    } else if (k === "disabled") {
      node.disabled = !!v;
    } else if (k === "selected") {
      node.selected = !!v;
    } else if (
      k === "value" &&
      (tag === "input" || tag === "textarea" || tag === "select")
    ) {
      node.value = String(v);
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/** Get element by id */
export function q(id) {
  return document.getElementById(id);
}

/** querySelector with optional root */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** Clear all children from an element */
export function clr(node) {
  if (node) node.replaceChildren();
}

/** Safely set textContent by id */
export function setText(id, value) {
  const node = q(id);
  if (!node) return false;
  const next = String(value ?? "—");
  if (node.textContent !== next) node.textContent = next;
  return true;
}

/** Safely set an attribute by id */
export function setAttr(id, attr, value) {
  const node = q(id);
  if (!node) return false;
  const next = String(value ?? "");
  if (node.getAttribute(attr) !== next) node.setAttribute(attr, next);
  return true;
}

/** Get value of an input by id, with fallback */
export function getVal(id, fallback = "") {
  return q(id)?.value ?? fallback;
}

/** Get numeric value of an input by id */
export function getNum(id, fallback = 0) {
  const raw = q(id)?.value;
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Get checked state of a checkbox by id */
export function getChecked(id) {
  return !!q(id)?.checked;
}

/** Set checked state of a checkbox by id */
export function setChecked(id, bool) {
  const node = q(id);
  if (node) node.checked = !!bool;
}

/** Create a muted note div */
export function noteLine(text) {
  return el("div", { class: "note" }, [String(text ?? "")]);
}

/** Create a visual divider */
export function divider() {
  return el("div", { class: "divider" }, []);
}

/** Create a labelled section sub-heading */
export function subHeading(text) {
  return el(
    "div",
    {
      class: "formBlockTitle",
      style: "font-size:12px;color:var(--text-muted);margin-top:4px",
    },
    [String(text ?? "")],
  );
}

/** Convenience: build a simple key-value card */
export function kvCard(label, value) {
  return el("div", { class: "kv" }, [
    el("div", { class: "k" }, [String(label ?? "")]),
    el("div", { class: "v" }, [String(value ?? "—")]),
  ]);
}

/** Convenience: build a mini stat card */
export function miniStatCard(label, value, sub = "") {
  return el("div", { class: "miniCard" }, [
    el("div", { class: "miniTitle" }, [String(label ?? "")]),
    el("div", { class: "miniBig" }, [String(value ?? "—")]),
    el("div", { class: "miniSub" }, [String(sub ?? "")]),
  ]);
}
