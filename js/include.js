/* =========================================================
  include.js (최종 수정판)

  수정 요약(핵심)
  1) localStorage 키 생성: `::$${...}` → `::${...}` (불필요한 $ 제거 + trim 추가)
  2) history.pushState URL: `menu=$${...}` → `menu=${...}` (섹션 키 깨짐 방지)
  3) 에러 메시지 템플릿: `$${...}` → `${...}` (디버깅 메시지 정상화)
  4) (안전장치) 기존 localStorage 값 마이그레이션(::$key → ::key) 1회 실행 추가

  원문 기능 목표
  - fetch()로 헤더/상단메뉴/사이드메뉴/본문을 조립
  - data-content 클릭 시 #main-content에 HTML 삽입(SPA처럼)
  - 디폴트 본문: pinned → localStorage → 상단첫메뉴 → 사이드첫메뉴 → fallback
  - pinned 공지 화면 표시 중에는 메뉴 active 표시 제거
========================================================= */

/* =========================================================
  0) 경로(PATH) + 옵션 + pinned 설정
========================================================= */
const PATH = {
  headerDefault: "./common/header.html",
  headerByKey: (key) => `./common/header-${key}.html`,

  footer: "./common/footer.html",

  topMenuByKey: (key) => `./menu/menu-${key}.html`,
  sideMenuByKey: (key) => `./menu/menu-side-${key}.html`,
  contentByKey: (key) => `./content/content-${key}.html`,

  // (선택) 홈 전용
  awesomeMenu: "./menu/menu-awesome.html",
  homeContent: "./content/content-home.html",
};

const HOME_USE_AWESOME_MENU = true;
const HOME_USE_HOME_CONTENT = true;

/**
 * 섹션별 "공지/안내" 파일 (항상 1순위로 먼저 보여줌)
 * - 값은 파일명만 써도 됨 -> normalizeContentUrl()이 ./content/ 를 붙여줌
 */
const USER_PINNED_DEFAULT = {
  web: "web-notice.html",
  camera: "camera-notice.html",
  // 필요하면 아래 3개도 pinned 공지를 운영하세요.
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

function getMode() {
  if (!isIndexPage()) return "page";
  const params = new URLSearchParams(location.search);
  return params.get("mode") || "home";
}

function getMenuKeyFromIndexApp(params) {
  return (params.get("menu") || "web").toLowerCase();
}

/**
 * 현재 섹션 키를 정확히 구함
 * - camera.html 같은 일반 페이지: "camera"
 * - index.html?mode=app&menu=camera : "camera"
 */
function getCurrentSectionKey() {
  if (isIndexPage()) {
    const params = new URLSearchParams(location.search);
    const mode = getMode();
    if (mode === "app") return getMenuKeyFromIndexApp(params);
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

/**
 * fetch로 텍스트(HTML) 불러오기
 * - 실패(404 등) 시 reject
 */
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
 * 본문으로 삽입된 HTML 내부 <script>가 실행되도록 다시 실행
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
  3) 표시 모드(home/app) 제어
========================================================= */
function setDisplayMode(mode) {
  const home = document.querySelector("#home-content");
  const left = document.querySelector("#left-menu");
  const main = document.querySelector("#main-content");

  const isHome = mode === "home";
  if (home) home.style.display = isHome ? "block" : "none";
  if (left) left.style.display = isHome ? "none" : "block";
  if (main) main.style.display = isHome ? "none" : "block";
}

/* =========================================================
  4) URL 정규화 / localStorage / active 처리 / 디폴트 결정
========================================================= */

/**
 * data-content / href 값을 항상 "./content/xxx.html"로 통일
 * - "camera-notice.html" -> "./content/camera-notice.html"
 * - "./content/a.html" -> "./content/a.html"
 */
function normalizeContentUrl(input) {
  if (!input) return "";
  let url = String(input).trim();

  url = url.replace(/^\.\//, "");                 // "./content/a.html" -> "content/a.html"
  if (!url.includes("/")) url = "content/" + url;  // "a.html" -> "content/a.html"
  if (!url.startsWith("content/")) url = "content/" + url.split("/").pop();

  return "./" + url;
}

/* ---------- localStorage: 섹션별 "마지막으로 본 본문" ---------- */
function storageKeyForSectionDefault(sectionKey) {
  const key = String(sectionKey ?? "").trim().toLowerCase();
  return `USER_DEFAULT_CONTENT::${key}`;
}

function saveUserDefaultContent(sectionKey, contentUrl) {
  const k = storageKeyForSectionDefault(sectionKey);
  const v = normalizeContentUrl(contentUrl);
  localStorage.setItem(k, v);
}

function loadUserDefaultContent(sectionKey) {
  const k = storageKeyForSectionDefault(sectionKey);
  const v = localStorage.getItem(k);
  return v ? normalizeContentUrl(v) : "";
}

/**
 * (안전장치) 과거 코드가 `USER_DEFAULT_CONTENT::$web` 형태로 저장해 둔 값이 있으면
 * 새 키(`USER_DEFAULT_CONTENT::web`)로 1회 옮겨줌.
 */
function migrateUserDefaultContentKeys(sectionKeys) {
  const normalizeKey = (k) => String(k ?? "").trim().toLowerCase();

  sectionKeys.map(normalizeKey).forEach((sectionKey) => {
    if (!sectionKey) return;

    const oldKey = `USER_DEFAULT_CONTENT::$${sectionKey}`; // 예전(불필요한 $ 포함) 키
    const newKey = `USER_DEFAULT_CONTENT::${sectionKey}`;  // 새 표준 키

    const oldVal = localStorage.getItem(oldKey);
    const newVal = localStorage.getItem(newKey);

    if (!newVal && oldVal) {
      localStorage.setItem(newKey, oldVal);
      // 완전 정리(이동)하려면 아래 주석을 해제하세요.
      // localStorage.removeItem(oldKey);
    }
  });
}

/* ---------- pinned(공지) 판별 ---------- */
function getPinnedUrlForSection(sectionKey) {
  const k = String(sectionKey || "").toLowerCase();
  const pinned = USER_PINNED_DEFAULT[k];
  return pinned ? normalizeContentUrl(pinned) : "";
}

function isPinnedNoticeUrl(sectionKey, contentUrl) {
  const pinnedUrl = getPinnedUrlForSection(sectionKey);
  if (!pinnedUrl) return false;
  return normalizeContentUrl(contentUrl) === pinnedUrl;
}

/* ---------- 상단 active (1차 메뉴만) ---------- */
function getTopLevelMenuLinks(topMenuEl) {
  return topMenuEl.querySelectorAll("ul > li.topMenuLi > a.menuLink[data-content]");
}

/**
 * 상단 1차 메뉴 중, contentUrl과 매칭되는 항목을 active로 지정
 * @returns {boolean} 매칭 성공 여부
 */
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

/**
 * 상단 메뉴에 active가 하나도 없으면 첫 1차 메뉴를 active로(보험)
 * @returns {boolean} active 설정 여부
 */
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
  topMenu
    .querySelectorAll("ul > li.topMenuLi > a.menuLink.active")
    .forEach((a) => a.classList.remove("active"));
}

/* ---------- 사이드 active ---------- */
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

/* ---------- 자동 디폴트 본문 URL 결정 ---------- */
/**
 * 1) pinned
 * 2) localStorage
 * 3) 상단 1차 첫 메뉴
 * 4) 사이드 첫 메뉴
 * 5) fallback
 */
function getDefaultContentUrlFromMenus(sectionKey) {
  const key = String(sectionKey || "").toLowerCase();

  const pinnedUrl = getPinnedUrlForSection(key);
  if (pinnedUrl) return pinnedUrl;

  const saved = loadUserDefaultContent(key);
  if (saved) return saved;

  const top = document.getElementById("topMenu");
  if (top) {
    const firstTop = top.querySelector("ul > li.topMenuLi > a.menuLink[data-content]");
    if (firstTop?.dataset?.content) return normalizeContentUrl(firstTop.dataset.content);
  }

  const left = document.getElementById("left-menu");
  if (left) {
    const firstSide = left.querySelector("a.side-link[data-content]");
    if (firstSide?.dataset?.content) return normalizeContentUrl(firstSide.dataset.content);
  }

  return PATH.contentByKey(key);
}

/**
 * pinned(공지)을 제외하고 2순위부터 다시 계산
 * (= localStorage → 상단첫메뉴 → 사이드첫메뉴 → fallback)
 */
function getFallbackContentUrlFromMenus(sectionKey) {
  const key = String(sectionKey || "").toLowerCase();

  const saved = loadUserDefaultContent(key);
  if (saved) return saved;

  const top = document.getElementById("topMenu");
  if (top) {
    const firstTop = top.querySelector("ul > li.topMenuLi > a.menuLink[data-content]");
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
  5) 레이아웃 파츠 로더(헤더/상단/사이드/푸터)
========================================================= */

/** 헤더 HTML 적용: 기존 #site-header가 있으면 교체, 없으면 slot 뒤에 삽입 */
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
  const url = PATH.topMenuByKey(key);

  return fetchText(url, `상단 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      document.getElementById("topMenu")?.remove();
      insertHtmlAfterSlot("#nav-slot", html);
      bindTopMenuClickHandler(); // 클릭 이벤트 연결
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
      initSideMenu(); // 사이드 클릭 이벤트 연결
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
  6) 본문 로더 + 퀵메뉴(기존 기능 유지)
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

/**
 * 본문(#main-content 등)에 url의 HTML을 로드해서 삽입
 * @returns {Promise<boolean>} 성공하면 true, 실패하면 false
 */
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
  7) 메인 조립 함수: loadAllByKey (핵심)
========================================================= */
async function loadAllByKey(key) {
  const sectionKey = String(key || "").toLowerCase();

  // 1) 헤더/메뉴/사이드 먼저 로드(순서 중요)
  await loadHeaderByKey(sectionKey);
  await loadTopMenuByKey(sectionKey);
  await loadSideMenuByKey(sectionKey);

  const main = document.querySelector("#main-content");

  // 2) 디폴트 URL 계산(1순위 pinned 포함)
  let defaultUrl = getDefaultContentUrlFromMenus(sectionKey);

  // 3) pinned 포함 디폴트 로드 시도
  let loaded = await loadHtmlInto("#main-content", defaultUrl, { scroll: false });
  if (main) main.dataset.currentContent = defaultUrl;

  // 4) pinned였는데 로드 실패(404 등)하면 -> pinned 제외 fallback으로 재시도
  if (!loaded && isPinnedNoticeUrl(sectionKey, defaultUrl)) {
    defaultUrl = getFallbackContentUrlFromMenus(sectionKey);
    loaded = await loadHtmlInto("#main-content", defaultUrl, { scroll: false });
    if (main) main.dataset.currentContent = defaultUrl;
  }

  // 5) active 처리
  // 5-A) pinned 공지가 "성공적으로" 로드된 경우: 메뉴 active를 표시하지 않음
  if (loaded && isPinnedNoticeUrl(sectionKey, defaultUrl)) {
    clearTopMenuActive();
    clearSideMenuActive();
    return;
  }

  // 5-B) 일반 콘텐츠(또는 pinned 실패 후 fallback)인 경우: active 동기화
  const topMatched = setTopMenuActiveByContent(defaultUrl);
  setSideMenuActiveByContent(defaultUrl);

  // 상단 메뉴 매칭이 안 되면 첫 메뉴를 보험으로 active
  if (!topMatched) initTopMenuDefaultActive();
}

/* =========================================================
  8) 이벤트 바인딩: 상단 메뉴 / 사이드 메뉴
========================================================= */
function bindTopMenuClickHandler() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  // 중복 바인딩 방지
  if (topMenu.dataset.bound === "true") return;
  topMenu.dataset.bound = "true";

  topMenu.addEventListener("click", async (e) => {
    const sectionKey = getCurrentSectionKey();

    // (A) submenuLink: 원칙은 외부 링크.
    //     혹시 내부 content 파일로 잘못 연결된 경우를 위한 안전장치.
    const sub = e.target.closest("a.submenuLink");
    if (sub && topMenu.contains(sub)) {
      const href = sub.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) return; // 외부 링크는 기본 이동

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

    // (B) menuLink 처리
    const link = e.target.closest("a.menuLink");
    if (!link) return;

    // (B-1) index app 모드에서 섹션 이동용(data-key)
    const key = (link.dataset.key || "").toLowerCase();
    const mode = getMode();
    if (key && isIndexPage() && mode === "app") {
      e.preventDefault();
      history.pushState(null, "", `index.html?mode=app&menu=${encodeURIComponent(key)}`);
      loadAllByKey(key);
      return;
    }

    // (B-2) 본문 교체(data-content)
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
      return;
    }

    // 나머지는 href 기본 이동
  });
}

function initSideMenu() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  // 중복 바인딩 방지
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

  // 사이드 메뉴가 로드된 직후: 현재 본문이 pinned면 active 만들지 않음
  const main = document.querySelector("#main-content");
  const currentUrl = main?.dataset?.currentContent || "";
  const sectionKey = getCurrentSectionKey();

  if (currentUrl && isPinnedNoticeUrl(sectionKey, currentUrl)) {
    clearSideMenuActive();
    return;
  }

  // currentUrl이 있으면 그에 맞춰 active
  if (currentUrl) {
    setSideMenuActiveByContent(currentUrl);
  }
}

/* =========================================================
  9) 부팅: DOMContentLoaded
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // fetch()는 file://에서 막히므로 안내
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

  // (추가) localStorage 키 마이그레이션: 한 번만 실행되도록 안전하게 호출
  // - 기존에 `USER_DEFAULT_CONTENT::$web` 같은 키가 남아 있어도 새 규칙으로 이어서 사용 가능
  migrateUserDefaultContentKeys(["web", "camera", "family", "tour", "woodwork"]);

  const params = new URLSearchParams(location.search);
  const mode = getMode();

  document.body.classList.toggle("mode-app", mode === "app");

  // footer는 어느 화면이든 공통으로 먼저 로드해도 OK
  loadFooter();

  // index.html 처리
  if (isIndexPage()) {
    // HOME 모드
    if (mode === "home") {
      setDisplayMode("home");

      // 홈 헤더
      fetchText(PATH.headerDefault).then(applyHeaderHtml).catch(console.error);

      // 홈 상단 메뉴
      if (HOME_USE_AWESOME_MENU) {
        fetchText(PATH.awesomeMenu, "menu-awesome.html 을 불러올 수 없습니다.")
          .then((html) => {
            document.getElementById("topMenu")?.remove();
            insertHtmlAfterSlot("#nav-slot", html);
            // 홈에서 data-content 방식 본문 교체까지 하고 싶으면 아래를 켜세요.
            // bindTopMenuClickHandler();
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

    // APP 모드
    setDisplayMode("app");
    loadAllByKey(getMenuKeyFromIndexApp(params));

    // 뒤로/앞으로 버튼 처리
    window.addEventListener("popstate", () => {
      const p = new URLSearchParams(location.search);
      const m = p.get("mode") || "home";
      if (m === "home") location.href = "index.html?mode=home";
      else loadAllByKey(getMenuKeyFromIndexApp(p));
    });

    return;
  }

  // 일반 페이지(camera.html 등)
  setDisplayMode("app");
  loadAllByKey(getPageKey());
});
