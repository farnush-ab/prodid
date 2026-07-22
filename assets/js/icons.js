/* =========================================================
   پرودید — مجموعه آیکن‌های SVG خطی
   استفاده: icon("name")  یا  <span data-icon="name"></span>
   ========================================================= */

const ICONS = {
  /* ---- رابط کاربری ---- */
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  phone: '<path d="M5 4h3.5l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 3 6.2 2 2 0 0 1 5 4Z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  cart: '<path d="M3 4h2l2.4 11h10.8l2-8H7"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/>',
  home: '<path d="m4 11 8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  store: '<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a2.6 2.6 0 0 0 5.3 0A2.6 2.6 0 0 0 14.6 9 2.6 2.6 0 0 0 20 9"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M9.5 20v-5.5h5V20"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chevron: '<path d="m14 6-6 6 6 6"/>',
  arrow: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.8" cy="17.5" r="1.8"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="m8.8 13.5-1.6 6 4.8-2.4 4.8 2.4-1.6-6"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5Z"/><circle cx="16" cy="13.8" r="1.2" fill="currentColor" stroke="none"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L4 21l1.5-4.4A8.5 8.5 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r="1" fill="currentColor" stroke="none"/>',
  scale: '<path d="M12 4v16M7 20h10"/><path d="m7 6-3 6a3.2 3.2 0 0 0 6 0L7 6l10-1.5M17 4.5l-3 6a3.2 3.2 0 0 0 6 0l-3-6"/>',
  box: '<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4Z"/><path d="M3.5 8 12 12l8.5-4M12 12v8"/>',
  flame: '<path d="M12 21c3.6 0 6-2.4 6-5.6 0-4-3.3-6-4.5-9.4-1 1.4-1.6 2.7-1.6 4.4-1.2-.7-2-1.7-2.5-3.3C7.7 9 6 11.4 6 15.4 6 18.6 8.4 21 12 21Z"/>',
  note: '<path d="M5 4.5h11l3 3V19.5H5Z"/><path d="M16 4.5V8h3.5M8.5 12h7M8.5 15.5h4.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8h.01"/>',
  package: '<path d="M4.5 7.5h15v12h-15z"/><path d="M4.5 7.5 6.7 4h10.6l2.2 3.5M12 4v3.5M9.5 12h5"/>',
  send: '<path d="m4 11 16-7-5.5 16-3-6.5L4 11Z"/><path d="m11.5 13.5 4-4"/>',
  headset: '<path d="M4.5 13.5V12a7.5 7.5 0 0 1 15 0v1.5"/><rect x="3.5" y="13" width="4" height="6" rx="1.8"/><rect x="16.5" y="13" width="4" height="6" rx="1.8"/><path d="M19.5 19a4 4 0 0 1-4 2.5h-1.5"/>',
  snowflake: '<path d="M12 3v18M5 6.5l14 11M19 6.5l-14 11M12 3l-2 2.2M12 3l2 2.2M12 21l-2-2.2M12 21l2-2.2"/>',

  /* ---- دسته‌بندی‌ها / محصولات ---- */
  steak: '<path d="M4 12.5c0-3.6 3-6 7.4-6 4.2 0 8.6 1.6 8.6 5s-2.5 6-7.5 6c-4.8 0-8.5-1.4-8.5-5Z"/><path d="M6.8 12.4c0-1.8 1.7-3.2 4.3-3.2 2.5 0 5.6.8 5.6 2.6s-1.7 3.4-4.8 3.4c-2.8 0-5.1-.9-5.1-2.8Z"/><path d="M11.5 11.8h.01"/>',
  skewer: '<path d="M3.5 20.5 20.5 3.5"/><path d="M8.2 12.9 11 15.7c.8.8 2 .8 2.8 0s.8-2 0-2.8l-2.8-2.8c-.8-.8-2-.8-2.8 0s-.8 2 0 2.8ZM13 8.1l2.9 2.9c.8.8 2 .8 2.8 0"/><path d="M5.4 15.7l2.9 2.9"/>',
  drumstick: '<path d="M15.5 3.5a5 5 0 0 1 5 5c0 2.8-2.2 5-5 5-.6 0-1.2-.1-1.8-.3l-4.4 4.4"/><path d="M13.7 13.2 9.3 8.8A5 5 0 0 1 15.5 3.5"/><path d="m9.3 17-1.5 1.5a1.9 1.9 0 1 1-2.7-2.7L6.6 14.3a1.9 1.9 0 0 1 2.7 2.7Z"/>',
  sausage: '<path d="M5 19a3 3 0 0 1-1-5.8A9.5 9.5 0 0 1 13.2 4 3 3 0 0 1 19 5c.4 1.5-.4 2.4-1.4 2.8A9.5 9.5 0 0 1 7.8 17.6C7.4 18.6 6.5 19.4 5 19Z"/><path d="M9.5 9.5h.01M13 7.5h.01M11 12h.01"/>',
  burger: '<path d="M5 10a7 7 0 0 1 14 0Z"/><path d="M4.5 13.5h15M6 20h12a1.8 1.8 0 0 0 1.8-1.8V17H4.2v1.2A1.8 1.8 0 0 0 6 20Z"/><path d="M8.5 7h.01M12 6.2h.01M15.5 7h.01"/>',
  leaf: '<path d="M5.5 18.5C4 10 9.5 4.8 19 4.5c.6 9.7-4.6 15-13.5 14Z"/><path d="M5.5 18.5C8 13 11.5 9.8 15.5 8"/>',
  bowl: '<path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M8 20h8M12 17.5V20"/><path d="M9 8.5c1.5-2 4.5-2 6 0M12 5.5c.8-1.2 2.4-1.4 3.5-.5"/>',
  fish: '<path d="M3.5 12c3-4 6.5-6 10-6 3 0 5.5 2 7 6-1.5 4-4 6-7 6-3.5 0-7-2-10-6Z"/><path d="M3.5 12 6 9m-2.5 3L6 15"/><circle cx="16.2" cy="10.8" r=".6" fill="currentColor" stroke="none"/>',
  milk: '<path d="M9 3.5h6M9.5 3.5v3L7 11v8.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5V11l-2.5-4.5v-3"/><path d="M7 14.5h10"/>',
  basket: '<path d="M4 10h16l-1.5 9.5a1.8 1.8 0 0 1-1.8 1.5H7.3a1.8 1.8 0 0 1-1.8-1.5L4 10Z"/><path d="m8 10 3-6M16 10l-3-6M9.5 13.5v4M14.5 13.5v4"/>',
  falafel: '<circle cx="8" cy="9" r="3.2"/><circle cx="16" cy="9" r="3.2"/><circle cx="12" cy="15.5" r="3.2"/>',
  wifi: '<path d="M2.5 8.5a15 15 0 0 1 19 0"/><path d="M5.5 12a11 11 0 0 1 13 0"/><path d="M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  shield: '<path d="M12 3.5 19 6v5c0 4.5-3 8-7 9.5C8 19 5 15.5 5 11V6l7-2.5Z"/><path d="m9 11.5 2 2 4-4"/>',
};

function icon(name, cls = "") {
  return `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
}

/* جایگزینی <span data-icon="..."></span> در HTML استاتیک */
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}
