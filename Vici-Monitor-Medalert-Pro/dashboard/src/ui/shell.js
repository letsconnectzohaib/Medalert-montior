import { el } from './dom.js';

function joinClass(...parts) {
  return parts.filter(Boolean).join(' ');
}

function safeText(value, fallback = '') {
  const s = String(value ?? '').trim();
  return s || fallback;
}

export function setBadge(container, id, kind, text) {
  if (!container) return null;
  const badge =
    container.querySelector(`#${id}`) ||
    el('span', { id, class: 'badge warn' }, []);

  badge.classList.remove('good', 'warn', 'bad');
  badge.classList.add(kind || 'warn');
  badge.textContent = safeText(text, '—');

  if (!badge.parentElement) {
    container.appendChild(badge);
  }
  return badge;
}

export function createBrandBlock({
  title = 'Vicidial Monitor Pro',
  subtitle = 'Operations intelligence',
  accent = 'VM',
} = {}) {
  return el('div', { class: 'sbBrandWrap' }, [
    el('div', { class: 'sbBrandMark', 'aria-hidden': 'true' }, [accent]),
    el('div', { class: 'sbBrandText' }, [
      el('div', { class: 'sbBrand' }, [title]),
      el('div', { class: 'sbSub' }, [subtitle]),
    ]),
  ]);
}

export function createSidebarPageButton(page, {
  isActive = false,
  onNavigate = () => {},
} = {}) {
  const icon = safeText(page?.icon, '•');
  const label = safeText(page?.label, page?.id || 'Page');
  const description = safeText(page?.description, '');
  const id = safeText(page?.id, '');

  return el(
    'button',
    {
      id: id ? `nav_${id}` : undefined,
      type: 'button',
      class: joinClass('sbLink', isActive && 'active'),
      onclick: () => onNavigate(id),
      title: description || label,
      'data-page': id,
    },
    [
      el('span', { class: 'sbLinkIcon', 'aria-hidden': 'true' }, [icon]),
      el('span', { class: 'sbLinkBody' }, [
        el('span', { class: 'sbLinkLabel' }, [label]),
        description
          ? el('span', { class: 'sbLinkDesc' }, [description])
          : el('span', { class: 'sbLinkDesc isEmpty' }, ['']),
      ]),
    ],
  );
}

export function createSidebarGroup(group, {
  activePage = '',
  onNavigate = () => {},
  includeSections = true,
} = {}) {
  const label = safeText(group?.label, 'Section');
  const icon = safeText(group?.icon, '•');
  const description = safeText(group?.description, '');
  const pages = Array.isArray(group?.pages) ? group.pages : [];
  const sections = Array.isArray(group?.sections) ? group.sections : [];

  return el('section', { class: 'sbGroup' }, [
    el('div', { class: 'sbGroupHeader' }, [
      el('div', { class: 'sbGroupTitleWrap' }, [
        el('span', { class: 'sbGroupIcon', 'aria-hidden': 'true' }, [icon]),
        el('span', { class: 'sbGroupTitle' }, [label]),
      ]),
      description
        ? el('div', { class: 'sbGroupDesc' }, [description])
        : el('div', { class: 'sbGroupDesc isEmpty' }, ['']),
    ]),
    el(
      'div',
      { class: 'sbNav' },
      pages.map((page) =>
        createSidebarPageButton(page, {
          isActive: page?.id === activePage,
          onNavigate,
        }),
      ),
    ),
    includeSections && sections.length
      ? createSidebarSectionRail(sections)
      : el('div', { class: 'sbSectionRail isEmpty' }, []),
  ]);
}

export function createSidebarSectionRail(sections = []) {
  const items = Array.isArray(sections) ? sections : [];
  return el(
    'div',
    { class: 'sbSectionRail' },
    items.map((section) =>
      el('div', { class: 'sbMiniSection', title: safeText(section?.description, section?.label) }, [
        el('span', { class: 'sbMiniSectionIcon', 'aria-hidden': 'true' }, [
          safeText(section?.icon, '•'),
        ]),
        el('span', { class: 'sbMiniSectionLabel' }, [safeText(section?.label, 'Section')]),
      ]),
    ),
  );
}

export function createSidebar(groups, {
  activePage = '',
  onNavigate = () => {},
  brand,
  footerChildren = [],
} = {}) {
  const safeGroups = Array.isArray(groups) ? groups : [];

  return el('aside', { class: 'sidebar' }, [
    brand || createBrandBlock(),
    el(
      'div',
      { class: 'sidebarGroups' },
      safeGroups.map((group) =>
        createSidebarGroup(group, {
          activePage,
          onNavigate,
          includeSections: group?.id === 'intelligence',
        }),
      ),
    ),
    el('div', { class: 'sbFooter' }, footerChildren),
  ]);
}

export function createTopStatusBadges() {
  return el('div', { class: 'topBadges' }, []);
}

export function createPageHeader({
  title = 'Overview',
  description = '',
  badgesNode = null,
  eyebrow = '',
  actions = [],
} = {}) {
  const right =
    badgesNode ||
    el('div', { class: 'topBadges' }, []);

  const actionNodes = Array.isArray(actions) ? actions : [];

  return el('div', { class: 'pageHeader' }, [
    el('div', { class: 'pageHeaderMain' }, [
      eyebrow ? el('div', { class: 'pageEyebrow' }, [eyebrow]) : el('div', { class: 'pageEyebrow isEmpty' }, ['']),
      el('div', { class: 'pageTitle' }, [title]),
      el('div', { class: 'pageDesc' }, [description]),
    ]),
    el('div', { class: 'pageHeaderRight' }, [
      actionNodes.length
        ? el('div', { class: 'pageHeaderActions' }, actionNodes)
        : el('div', { class: 'pageHeaderActions isEmpty' }, []),
      right,
    ]),
  ]);
}

export function createShellLayout({
  sidebar,
  header,
  pageContainer,
  toastHost,
} = {}) {
  const content = el('main', { class: 'content' }, [
    header || el('div', { class: 'pageHeader' }, []),
    pageContainer || el('div', { id: 'page_container' }, []),
  ]);

  const shell = el('div', { class: 'shell' }, [
    sidebar || el('aside', { class: 'sidebar' }, []),
    content,
  ]);

  if (toastHost) {
    shell.appendChild(toastHost);
  }

  return {
    shell,
    content,
  };
}

export function createToastHost() {
  return el('div', { id: 'toastHost', class: 'toastHost' }, []);
}

export function createSidebarFooter({
  gatewayText = '',
  onLogout = () => {},
  userText = '',
} = {}) {
  return [
    el('div', { class: 'sbMeta' }, [
      el('div', { class: 'sbMetaLabel' }, ['Gateway']),
      el('div', { id: 'sb_gateway', class: 'sbMetaValue' }, [safeText(gatewayText, '—')]),
    ]),
    userText
      ? el('div', { class: 'sbMeta' }, [
          el('div', { class: 'sbMetaLabel' }, ['User']),
          el('div', { class: 'sbMetaValue' }, [userText]),
        ])
      : el('div', { class: 'sbMeta isEmpty' }, []),
    el(
      'button',
      {
        type: 'button',
        class: 'btn sbLogoutBtn',
        onclick: onLogout,
      },
      ['Sign out'],
    ),
  ];
}

export function updateSidebarActive(sidebarRoot, activePage) {
  if (!sidebarRoot) return;
  sidebarRoot.querySelectorAll('.sbLink').forEach((node) => {
    const isActive = node.getAttribute('data-page') === activePage;
    node.classList.toggle('active', isActive);
  });
}

export function updateGatewayText(sidebarRoot, text) {
  const node = sidebarRoot?.querySelector('#sb_gateway');
  if (node) {
    node.textContent = safeText(text, '—');
  }
}
