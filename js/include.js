/* =========================================================
  include.js (단순화 버전: CSS on/off 제어 제거)

  [이 파일이 하는 일]
  1) index.html?mode=home  → 홈 화면(awesome 메뉴 + 홈 콘텐츠)
  2) index.html?mode=app&menu=camera → 앱 화면(헤더/탑메뉴/사이드/본문 조립)
  3) 메뉴 클릭 시 본문만 바꾸거나(SPA처럼), 섹션을 바꿉니다.

  [중요 원칙]
  - CSS 파일(style.css, awesome-style.css)은 "항상 로드"된 상태로 둡니다.
  - JS는 CSS를 켜거나/끄지 않습니다.
  - 화면 전환은
    - body.classList.toggle("mode-app", ...)
    - setDisplayMode("home" or "app")
    로만 합니다.
========================================================= */


/* =========================================================
  0) 설정: 경로(PATH) + 옵션 + pinned(공지)
========================================================= */

const PATH = {
  headerDefault: "./common/header.html",
  headerByKey: (key) => `./common/header-${key}.html`,

  footer: "./common/footer.html",

  topMenuByKey: (key) => `./menu/menu-${key}.html`,
  sideMenuByKey: (key) => `./menu/menu-side-${key}.html`,
  contentByKey: (key) => `./content/content-${key}.html`,

  // 홈 전용
  awesomeMenu: "./menu/menu-awesome.html",
  homeContent: "./content/content-home.html",
};

const HOME_USE_AWESOME_MENU = true;
const HOME_USE_HOME_CONTENT = true;

/**
 * 섹션별 pinned(공지/안내) 파일
 * - 해당 섹션에 들어가면 이 파일을 1순위로 보여줌
 */
const USER_PINNED_DEFAULT = {
  web: "web-notice.html",
  camera: "camera-notice.html",
  // family: "family-notice.html",
  // tour: "tour-notice.html",
  // woodwork: "woodwork-notice.html",
};


/* =========================================================
  1) URL/페이지/모드 유틸
========================================================= */

function getCurrentFileName() {
  return location.pathname.split("/").pop() || "index.html";
}

function isIndexPage() {
  const currentFile = getCurrentFileName();
  return currentFile === "index.html" || currentFile === "";
}

function getPageKey() {
  const file = (getCurrentFileName() || "index.html").toLowerCase();
  return file.replace(".html", "");
}

/**
 * index.html에서만 의미 있는 모드
 * - home: index.html?mode=home
 * - app : index.html?mode=app&menu=camera
 */
function getMode() {
  if (!isIndexPage()) return "page";
  const params = new URLSearchParams(location.search);
  return params.get("mode") || "home";
}

function getMenuKeyFromIndexApp(params) {
  return (params.get("menu") || "web").toLowerCase();
}

/**
 * “현재 섹션키”를 하나로 통일해서 얻기
 * - index app: index.html?mode=app&menu=camera → camera
 * - camera.html: → camera
 */
function getCurrentSectionKey() {
  if (isIndexPage()) {
    const params = new URLSearchParams(location.search);
    if (getMode() === "app") return getMenuKeyFromIndexApp(params);
  }
  return getPageKey();
}


/* =========================================================
  2) DOM 삽입/Fetch 유틸
========================================================= */

function insertHtmlAfterSlot(slotSelector, html) {
  const slot = document.querySelector(slotSelector);
  if (!slot) return;
  slot.insertAdjacentHTML("afterend", html);
}

function insertHtmlBeforeSlot(slotSelector, html) {
  const slot = document.querySelector(slotSelector);
  if (!slot) return;
  slot.insertAdjacentHTML("beforebegin", html);
}

function fetchText(url, errorMessage) {
  return fetch(url).then((res) => {
    if (!res.ok) {
      return Promise.reject(
        errorMessage || `불러오기 실패: ${url} (status ${res.status})`
      );
    }
    return res.text();
  });
}

/**
 * innerHTML로 넣은 HTML 내부의 <script>는 실행되지 않기 때문에
 * 스크립트 태그를 다시 만들어 실행되게 합니다.
 */
function rerunScripts(container) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    if (oldScript.src) newScript.src = oldScript.src;
    else newScript.textContent = oldScript.textContent;
    if (oldScript.type) newScript.type = oldScript.type;

    document.body.appendChild(newScript);
    oldScript.remove();
  });
}


/* =========================================================
  3) 화면 모드 전환(home/app)
========================================================= */

/**
 * home/app에 따라 “보이는 영역”만 바꿉니다.
 * - 레이아웃(좌/우 2열)은 CSS(style.css)가 담당합니다.
 */
function setDisplayMode(mode) {
  const home = document.querySelector("#home-content");
  const left = document.querySelector("#left-menu");
  const main = document.querySelector("#main-content");

  const isHome = mode === "home";

  if (home) home.style.display = isHome ? "block" : "none";
  if (left) left.style.display = isHome ? "none" : "block";
  if (main) main.style.display = isHome ? "none" : "block";
}

/**
 * app 모드로 들어갈 때 공통 처리
 * - body.mode-app 클래스 부여(= CSS에서 app 레이아웃 적용 가능)
 * - 홈 메뉴(#nav-slot 뒤에 꽂힌 nav.awesome)만 제거(헤더 안 nav.awesome은 유지)
 */
function enterAppMode() {
  document.body.classList.add("mode-app");
  setDisplayMode("app");

  // 홈에서 삽입한 menu-awesome(nav.awesome)만 제거
  document.querySelector("#nav-slot + nav.awesome")?.remove();
}

function enterHomeMode() {
  document.body.classList.remove("mode-app");
  setDisplayMode("home");
}


/* =========================================================
  4) URL 정규화 / localStorage / pinned / active / 디폴트 본문
========================================================= */

function normalizeContentUrl(input) {
  if (!input) return "";
  let url = String(input).trim();

  url = url.replace(/^\.\//, "");                   // "./content/a.html" -> "content/a.html"
  if (!url.includes("/")) url = "content/" + url;   // "a.html" -> "content/a.html"
  if (!url.startsWith("content/")) url = "content/" + url.split("/").pop();

  return "./" + url;
}

/* ----- localStorage: 섹션별 마지막 본문 ----- */

function storageKeyForSectionDefault(sectionKey) {
  const key = String(sectionKey ?? "").trim().toLowerCase();
  return `USER_DEFAULT_CONTENT::${key}`;
}

function saveUserDefaultContent(sectionKey, contentUrl) {
  localStorage.setItem(storageKeyForSectionDefault(sectionKey), normalizeContentUrl(contentUrl));
}

function loadUserDefaultContent(sectionKey) {
  const v = localStorage.getItem(storageKeyForSectionDefault(sectionKey));
  return v ? normalizeContentUrl(v) : "";
}

function migrateUserDefaultContentKeys(sectionKeys) {
  const normalizeKey = (k) => String(k ?? "").trim().toLowerCase();

  sectionKeys.map(normalizeKey).forEach((sectionKey) => {
    if (!sectionKey) return;

    const oldKey = `USER_DEFAULT_CONTENT::$${sectionKey}`;
    const newKey = `USER_DEFAULT_CONTENT::${sectionKey}`;

    const oldVal = localStorage.getItem(oldKey);
    const newVal = localStorage.getItem(newKey);

    if (!newVal && oldVal) {
      localStorage.setItem(newKey, oldVal);
      // localStorage.removeItem(oldKey);
    }
  });
}

/* ----- pinned(공지) ----- */

function getPinnedUrlForSection(sectionKey) {
  const pinned = USER_PINNED_DEFAULT[String(sectionKey || "").toLowerCase()];
  return pinned ? normalizeContentUrl(pinned) : "";
}

function isPinnedNoticeUrl(sectionKey, contentUrl) {
  const pinnedUrl = getPinnedUrlForSection(sectionKey);
  return pinnedUrl && normalizeContentUrl(contentUrl) === pinnedUrl;
}

/* ----- 메뉴 active ----- */

function getTopLevelMenuLinks(topMenuEl) {
  return topMenuEl.querySelectorAll("ul > li.topMenuLi > a.menuLink[data-content]");
}

function setTopMenuActiveByContent(contentUrl) {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return false;

  const targetFile = normalizeContentUrl(contentUrl).split("/").pop();
  const links = getTopLevelMenuLinks(topMenu);
  if (!links.length) return false;

  let matched = null;
  links.forEach((a) => {
    const aFile = normalizeContentUrl(a.dataset.content || "").split("/").pop();
    if (aFile === targetFile) matched = a;
  });

  if (!matched) return false;

  links.forEach((a) => a.classList.remove("active"));
  matched.classList.add("active");
  return true;
}

function initTopMenuDefaultActive() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return false;

  const links = getTopLevelMenuLinks(topMenu);
  if (!links.length) return false;

  if ([...links].some((a) => a.classList.contains("active"))) return false;
  links[0].classList.add("active");
  return true;
}

function clearTopMenuActive() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;
  topMenu.querySelectorAll("a.menuLink.active").forEach((a) => a.classList.remove("active"));
}

function setSideMenuActiveByContent(contentUrl) {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return false;

  const targetFile = normalizeContentUrl(contentUrl).split("/").pop();
  const links = sideMenu.querySelectorAll("a.side-link[data-content]");
  if (!links.length) return false;

  let matched = null;
  links.forEach((a) => {
    const aFile = normalizeContentUrl(a.dataset.content || "").split("/").pop();
    if (aFile === targetFile) matched = a;
  });

  if (!matched) return false;

  links.forEach((a) => a.classList.remove("active"));
  matched.classList.add("active");
  return true;
}

function clearSideMenuActive() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;
  sideMenu.querySelectorAll("a.side-link.active").forEach((a) => a.classList.remove("active"));
}

/* ----- 디폴트 본문 URL 결정 ----- */

function getDefaultContentUrlFromMenus(sectionKey) {
  const key = String(sectionKey || "").toLowerCase();

  const pinnedUrl = getPinnedUrlForSection(key);
  if (pinnedUrl) return pinnedUrl;

  const saved = loadUserDefaultContent(key);
  if (saved) return saved;

  const top = document.getElementById("topMenu");
  if (top) {
    const firstTop = top.querySelector("a.menuLink[data-content]");
    if (firstTop?.dataset?.content) return normalizeContentUrl(firstTop.dataset.content);
  }

  const left = document.getElementById("left-menu");
  if (left) {
    const firstSide = left.querySelector("a.side-link[data-content]");
    if (firstSide?.dataset?.content) return normalizeContentUrl(firstSide.dataset.content);
  }

  return PATH.contentByKey(key);
}

function getFallbackContentUrlFromMenus(sectionKey) {
  const key = String(sectionKey || "").toLowerCase();

  const saved = loadUserDefaultContent(key);
  if (saved) return saved;

  const top = document.getElementById("topMenu");
  if (top) {
    const firstTop = top.querySelector("a.menuLink[data-content]");
    if (firstTop?.dataset?.content) return normalizeContentUrl(firstTop.dataset.content);
  }

  const left = document.getElementById("left-menu");
  if (left) {
    const firstSide = left.querySelector("a.side-link[data-content]");
    if (firstSide?.dataset?.content) return normalizeContentUrl(firstSide.dataset.content);
  }

  return PATH.contentByKey(key);
}


/* =========================================================
  5) 레이아웃 파츠 로더(헤더/탑/사이드/푸터)
========================================================= */

function applyHeaderHtml(html) {
  const oldHeader = document.querySelector("#site-header");
  if (oldHeader) oldHeader.outerHTML = html;
  else insertHtmlAfterSlot("#header-slot", html);
}

function loadHeaderByKey(key) {
  const candidateUrl = PATH.headerByKey(key);

  return fetch(candidateUrl)
    .then((res) => (res.ok ? res.text() : fetchText(PATH.headerDefault)))
    .then(applyHeaderHtml)
    .catch((err) => {
      console.error(err);
      return fetchText(PATH.headerDefault).then(applyHeaderHtml).catch(console.error);
    });
}

function loadTopMenuByKey(key) {
  // 홈에서 붙인 menu-awesome만 제거(헤더 아이콘 nav.awesome은 유지)
  document.querySelector("#nav-slot + nav.awesome")?.remove();

  // 이전 topMenu 제거
  document.getElementById("topMenu")?.remove();

  const url = PATH.topMenuByKey(key);

  return fetchText(url, `상단 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      insertHtmlAfterSlot("#nav-slot", html);
      bindTopMenuClickHandler();
    })
    .catch(console.error);
}

function loadSideMenuByKey(key) {
  const left = document.getElementById("left-menu");
  if (!left) return Promise.resolve();

  const url = PATH.sideMenuByKey(key);

  return fetchText(url, `사이드 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      left.innerHTML = html;
      initSideMenu();
    })
    .catch((err) => {
      console.error(err);
      left.innerHTML = "<p>사이드 메뉴를 불러올 수 없습니다.</p>";
    });
}

function loadFooter() {
  return fetchText(PATH.footer, "footer.html 을 불러올 수 없습니다.")
    .then((html) => insertHtmlBeforeSlot("#footer-slot", html))
    .catch(console.error);
}


/* =========================================================
  6) 본문 로더 + 퀵메뉴
========================================================= */

function initFloatingQuickMenu() {
  const quick = document.getElementById("quick");
  if (!quick) return;

  if (quick.dataset.floatingInitialized === "true") return;
  quick.dataset.floatingInitialized = "true";

  const computedStyle = window.getComputedStyle(quick);
  const initialTop = parseInt(computedStyle.top, 10) || 150;
  let currentTop = initialTop;

  function update() {
    const scrollY = window.scrollY || window.pageYOffset;
    const targetTop = scrollY + initialTop;

    currentTop += (targetTop - currentTop) * 0.15;
    quick.style.top = currentTop + "px";

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

async function loadHtmlInto(targetSelector, url, options = { scroll: true }) {
  const target = document.querySelector(targetSelector);
  if (!target) return false;

  try {
    const html = await fetchText(url, `요청 파일을 불러올 수 없습니다: ${url}`);
    target.innerHTML = html;
    rerunScripts(target);
    initFloatingQuickMenu();

    if (options.scroll) {
      const rect = target.getBoundingClientRect();
      const offset = window.pageYOffset + rect.top - 80;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
    return true;
  } catch (err) {
    console.error("콘텐츠 로드 오류:", err);
    target.innerHTML = "<p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>";
    return false;
  }
}


/* =========================================================
  7) 화면 조립(핵심): loadAllByKey
========================================================= */

async function loadAllByKey(key) {
  const sectionKey = String(key || "").toLowerCase();

  // app 모드로 진입(클래스 + 표시영역 전환 + 홈 메뉴 제거)
  enterAppMode();

  // 1) 헤더 → 탑메뉴 → 사이드 순으로 먼저 로드
  await loadHeaderByKey(sectionKey);
  await loadTopMenuByKey(sectionKey);
  await loadSideMenuByKey(sectionKey);

  // 2) 본문 디폴트 결정(pinned 포함)
  const main = document.querySelector("#main-content");
  let defaultUrl = getDefaultContentUrlFromMenus(sectionKey);

  // 3) 본문 로드
  let loaded = await loadHtmlInto("#main-content", defaultUrl, { scroll: false });
  if (main) main.dataset.currentContent = defaultUrl;

  // 4) pinned 로드 실패 시 fallback 재시도
  if (!loaded && isPinnedNoticeUrl(sectionKey, defaultUrl)) {
    defaultUrl = getFallbackContentUrlFromMenus(sectionKey);
    loaded = await loadHtmlInto("#main-content", defaultUrl, { scroll: false });
    if (main) main.dataset.currentContent = defaultUrl;
  }

  // 5) 메뉴 active 처리
  if (loaded && isPinnedNoticeUrl(sectionKey, defaultUrl)) {
    clearTopMenuActive();
    clearSideMenuActive();
    return;
  }

  const topMatched = setTopMenuActiveByContent(defaultUrl);
  setSideMenuActiveByContent(defaultUrl);
  if (!topMatched) initTopMenuDefaultActive();
}


/* =========================================================
  8) 이벤트 바인딩
========================================================= */

/**
 * awesome 아이콘 메뉴 클릭 처리(홈 메뉴/헤더 아이콘 메뉴 공통)
 * - href가 web.html/camera.html 처럼 되어 있어도
 *   주소창은 index.html?mode=app&menu=camera 형태로 “보이게” 통일하고,
 *   페이지 이동 없이 loadAllByKey()로 화면을 다시 조립합니다.
 */
function bindAwesomeMenuToIndexApp() {
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest('nav.awesome a.menuLink');
      if (!a) return;

      const hrefRaw = (a.getAttribute("href") || "").trim();
      if (!hrefRaw) return;

      // 외부 링크/특수 링크는 그대로 둠
      if (/^(https?:)?\/\//i.test(hrefRaw)) return;
      if (hrefRaw.startsWith("#") || hrefRaw.startsWith("javascript:")) return;

      e.preventDefault();

      const file = hrefRaw.split("#")[0].split("?")[0].split("/").pop() || "";
      const base = file.toLowerCase().replace(/\.html?$/, "");

      // 집 아이콘(index.html)은 홈으로 이동(새로고침 포함 “진짜 홈”)
      if (base === "index") {
        location.href = "index.html?mode=home";
        return;
      }

      const map = {
        web: "web",
        camera: "camera",
        family: "family",
        tour: "tour",
        woodwork: "woodwork",
        menu4: "tour",
        menu5: "woodwork",
      };

      const menuKey = (map[base] || base).toLowerCase();
      if (!menuKey) return;

      history.pushState(
        null,
        "",
        `index.html?mode=app&menu=${encodeURIComponent(menuKey)}`
      );

      loadAllByKey(menuKey);
    },
    true
  );
}

function bindTopMenuClickHandler() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  if (topMenu.dataset.bound === "true") return;
  topMenu.dataset.bound = "true";

  topMenu.addEventListener("click", async (e) => {
    const sectionKey = getCurrentSectionKey();

    // 서브메뉴: 외부 링크는 그대로, content 링크면 SPA 처리
    const sub = e.target.closest("a.submenuLink");
    if (sub && topMenu.contains(sub)) {
      const href = sub.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) return;

      if (href.startsWith("./content/") || href.startsWith("content/")) {
        e.preventDefault();
        const url = normalizeContentUrl(href);

        await loadHtmlInto("#main-content", url);
        saveUserDefaultContent(sectionKey, url);

        const main = document.querySelector("#main-content");
        if (main) main.dataset.currentContent = url;

        setTopMenuActiveByContent(url);
        setSideMenuActiveByContent(url);
      }
      return;
    }

    const link = e.target.closest("a.menuLink");
    if (!link) return;

    // 본문 교체(data-content)
    const content = link.dataset.content;
    if (content) {
      e.preventDefault();
      const url = normalizeContentUrl(content);

      await loadHtmlInto("#main-content", url);
      saveUserDefaultContent(sectionKey, url);

      const main = document.querySelector("#main-content");
      if (main) main.dataset.currentContent = url;

      setTopMenuActiveByContent(url);
      setSideMenuActiveByContent(url);
    }
  });
}

function initSideMenu() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  if (sideMenu.dataset.bound === "true") return;
  sideMenu.dataset.bound = "true";

  sideMenu.addEventListener("click", async (e) => {
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault();

    const raw = link.getAttribute("data-content");
    if (!raw) return;

    const url = normalizeContentUrl(raw);
    const sectionKey = getCurrentSectionKey();

    await loadHtmlInto("#main-content", url);
    saveUserDefaultContent(sectionKey, url);

    const main = document.querySelector("#main-content");
    if (main) main.dataset.currentContent = url;

    setTopMenuActiveByContent(url);
    setSideMenuActiveByContent(url);
  });

  // 사이드 메뉴가 로드된 직후 active 동기화(현재 본문 기준)
  const main = document.querySelector("#main-content");
  const currentUrl = main?.dataset?.currentContent || "";
  const sectionKey = getCurrentSectionKey();

  if (currentUrl && isPinnedNoticeUrl(sectionKey, currentUrl)) {
    clearSideMenuActive();
    return;
  }

  if (currentUrl) setSideMenuActiveByContent(currentUrl);
}


/* =========================================================
  9) 부팅: DOMContentLoaded
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // file://로 열면 fetch가 막힐 수 있으므로 안내
  if (location.protocol === "file:") {
    document.body.innerHTML = `
      <div style="max-width:720px;margin:40px auto;font-family:system-ui;line-height:1.6">
        <h2>실행 방법 안내</h2>
        <p>이 프로젝트는 <code>fetch()</code>로 공통 파일을 불러오기 때문에
        <b>file://</b>로 열면 차단됩니다.</p>
        <p>VSCode에서 <b>Live Server</b>로 실행해 주세요.</p>
      </div>
    `;
    return;
  }

  migrateUserDefaultContentKeys(["web", "camera", "family", "tour", "woodwork"]);

  const params = new URLSearchParams(location.search);
  const mode = getMode();

  // footer는 항상 공통
  loadFooter();

  // awesome 아이콘 메뉴 클릭 가로채기(홈/헤더 공통)
  bindAwesomeMenuToIndexApp();

  // -------------------------
  // index.html 처리
  // -------------------------
  if (isIndexPage()) {
    // HOME
    if (mode === "home") {
      enterHomeMode();

      // 홈 헤더(기본 헤더)
      fetchText(PATH.headerDefault).then(applyHeaderHtml).catch(console.error);

      // 홈 상단 메뉴(awesome 메뉴)
      if (HOME_USE_AWESOME_MENU) {
        fetchText(PATH.awesomeMenu, "menu-awesome.html 을 불러올 수 없습니다.")
          .then((html) => {
            // 혹시 topMenu가 남아있으면 제거
            document.getElementById("topMenu")?.remove();
            insertHtmlAfterSlot("#nav-slot", html);
          })
          .catch(console.error);
      }

      // 홈 본문
      if (HOME_USE_HOME_CONTENT) {
        const homeBox = document.getElementById("home-content");
        if (homeBox) {
          fetchText(PATH.homeContent, "content-home.html 을 불러올 수 없습니다.")
            .then((html) => {
              homeBox.innerHTML = html;
              rerunScripts(homeBox);
            })
            .catch(console.error);
        }
      }

      return;
    }

    // APP: index.html?mode=app&menu=...
    enterAppMode();
    loadAllByKey(getMenuKeyFromIndexApp(params));

    // 뒤로/앞으로
    window.addEventListener("popstate", () => {
      const p = new URLSearchParams(location.search);
      const m = p.get("mode") || "home";
      if (m === "home") location.href = "index.html?mode=home";
      else loadAllByKey(getMenuKeyFromIndexApp(p));
    });

    return;
  }

  // -------------------------
  // 일반 페이지(camera.html 등)
  // -------------------------
  enterAppMode();
  loadAllByKey(getPageKey());
});