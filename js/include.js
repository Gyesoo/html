/* =========================================================
   include.js (공통 스크립트) - data-content 위주 최적화 정리본

   [페이지 구성 규칙]
   - camera.html / web.html / ... : 각 영역 전체 레이아웃 페이지
   - 상단 메뉴   : ./menu/menu-KEY.html
   - 사이드 메뉴 : ./menu/menu-side-KEY.html
   - 본문        : ./content/content-KEY.html
   - 헤더        : ./common/header-KEY.html (없으면 ./common/header.html)
   - 푸터        : ./common/footer.html

   [index.html 모드]
   - index.html?mode=home : 홈 화면
   - index.html?mode=app&menu=camera : 앱(SPA처럼 동작) 화면

   ---------------------------------------------------------
   실행 순서
   1) DOMContentLoaded
   2) file:// 체크
   3) mode 판단(home/app/page)
   4) footer 로드
   5) key로 헤더/상단/사이드/본문 로드
   6) 상단/사이드 클릭 시 본문 교체 + 탑메뉴 active 동기화
========================================================= */

/* =========================================================
   0) 경로(PATH) + 홈 옵션
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
  homeContent: "./content/content-home.html"
};

const HOME_USE_AWESOME_MENU = true;
const HOME_USE_HOME_CONTENT = true;

/* =========================================================
   1) URL 유틸 (페이지/모드/key)
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

/* =========================================================
   2) DOM/Fetch 유틸
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
      return Promise.reject(errorMessage || `불러오기 실패: ${url} (status ${res.status})`);
    }
    return res.text();
  });
}

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
   3) 화면 모드 표시(home/app)
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
   4) 탑메뉴 active 동기화 유틸 (data-content 위주 핵심)
========================================================= */

/** data-content 값을 항상 "./content/xxx.html"로 통일 */
function normalizeContentUrl(input) {
  if (!input) return "";
  let url = String(input).trim();

  // "./" 제거: "./content/a.html" -> "content/a.html"
  url = url.replace(/^\.\//, "");

  // 폴더가 없으면 content/ 붙임: "a.html" -> "content/a.html"
  if (!url.includes("/")) url = "content/" + url;

  // content/로 시작하지 않으면 파일명만 뽑아 content/로 통일
  if (!url.startsWith("content/")) url = "content/" + url.split("/").pop();

  // 최종 반환: "./content/a.html"
  return "./" + url;
}

/** 현재 본문(contentUrl)과 같은 data-content를 가진 탑메뉴를 active로 */
function setTopMenuActiveByContent(contentUrl) {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  // 비교 기준(./ 제거해서 content/... 형태로 맞춤)
  const target = normalizeContentUrl(contentUrl).replace(/^\.\//, "");
  const targetFile = target.split("/").pop();

  const links = topMenu.querySelectorAll("a.menuLink[data-content]");
  if (!links.length) return;

  let matched = null;

  links.forEach((a) => {
    const aNorm = normalizeContentUrl(a.dataset.content || "").replace(/^\.\//, "");
    const aFile = aNorm.split("/").pop();

    // 표기 흔들림 대비: 전체 경로 또는 파일명 일치 시 매칭
    if (aNorm === target || aFile === targetFile) matched = a;
  });

  if (!matched) return;

  topMenu.querySelectorAll("a.menuLink").forEach((a) => a.classList.remove("active"));
  matched.classList.add("active");
}

/** 탑메뉴 active가 없으면 첫 data-content 항목을 active로(보험용) */
function initTopMenuDefaultActive() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  if (topMenu.querySelector("a.menuLink.active")) return;

  const first = topMenu.querySelector("a.menuLink[data-content]");
  if (first) first.classList.add("active");
}

/* =========================================================
   5) 헤더 로드 (header-KEY 우선)
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

/* =========================================================
   6) 상단/사이드/본문/푸터 로드
========================================================= */
function loadTopMenuByKey(key) {
  const url = PATH.topMenuByKey(key);

  return fetchText(url, `상단 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      document.getElementById("topMenu")?.remove();
      insertHtmlAfterSlot("#nav-slot", html);

      bindTopMenuClickHandler();

      // 탑메뉴가 비어 보이지 않도록(매칭 실패 시 보험)
      initTopMenuDefaultActive();
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

function loadMainContentByKey(key) {
  const main = document.getElementById("main-content");
  if (!main) return Promise.resolve();

  const url = PATH.contentByKey(key);

  return fetchText(url, `본문 파일이 없습니다: ${url}`)
    .then((html) => {
      main.innerHTML = html;
      rerunScripts(main);
      initFloatingQuickMenu();

      // data-content 위주 프로젝트라면 “초기 본문”도 탑메뉴 active를 맞춰주는 게 자연스러움
      setTopMenuActiveByContent(url);
    })
    .catch((err) => {
      console.error(err);
      main.innerHTML = "<p>본문 내용을 불러올 수 없습니다.</p>";
    });
}

function loadFooter() {
  return fetchText(PATH.footer, "footer.html 을 불러올 수 없습니다.")
    .then((html) => insertHtmlBeforeSlot("#footer-slot", html))
    .catch(console.error);
}

/* =========================================================
   7) 한 번에 조립
========================================================= */
function loadAllByKey(key) {
  loadHeaderByKey(key);
  loadTopMenuByKey(key);
  loadSideMenuByKey(key);
  loadMainContentByKey(key);
}

/* =========================================================
   8) 상단 메뉴 클릭 처리 (data-content 위주)
========================================================= */
function bindTopMenuClickHandler() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  if (topMenu.dataset.bound === "true") return;
  topMenu.dataset.bound = "true";

  topMenu.addEventListener("click", (e) => {
    const link = e.target.closest("a.menuLink");
    if (!link) return;

    // (A) SPA KEY 이동: index.html + app 모드에서만 사용
    const key = (link.dataset.key || "").toLowerCase();
    const mode = getMode();

    if (key && isIndexPage() && mode === "app") {
      e.preventDefault();
      history.pushState(null, "", `index.html?mode=app&menu=${encodeURIComponent(key)}`);
      loadAllByKey(key);
      return;
    }

    // (B) 본문 교체: data-content 위주
    const content = link.dataset.content;
    if (content) {
      e.preventDefault();

      const url = normalizeContentUrl(content);
      loadHtmlInto("#main-content", url);

      // 탑메뉴 active 동기화(클릭했으니 바로 갱신)
      setTopMenuActiveByContent(url);
      return;
    }

    // 나머지는 href 기본 이동
  });
}

/* =========================================================
   9) DOMContentLoaded (시작점)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
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

  const params = new URLSearchParams(location.search);
  const mode = getMode();

  document.body.classList.toggle("mode-app", mode === "app");

  loadFooter();

  if (isIndexPage()) {
    // HOME
    if (mode === "home") {
      setDisplayMode("home");

      fetchText(PATH.headerDefault)
        .then(applyHeaderHtml)
        .catch(console.error);

      if (HOME_USE_AWESOME_MENU) {
        fetchText(PATH.awesomeMenu, "menu-awesome.html 을 불러올 수 없습니다.")
          .then((html) => {
            document.getElementById("topMenu")?.remove();
            insertHtmlAfterSlot("#nav-slot", html);

            // 홈에서 data-content 방식으로 본문 교체를 쓸 거면 아래도 켜기
            // bindTopMenuClickHandler();
            // initTopMenuDefaultActive();
          })
          .catch(console.error);
      }

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

    // APP
    setDisplayMode("app");
    loadAllByKey(getMenuKeyFromIndexApp(params));

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

/* =========================================================
   10) 기존 기능들 (퀵메뉴/본문 로드/사이드 클릭)
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

function loadHtmlInto(targetSelector, url, options = { scroll: true }) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  fetchText(url, `요청 파일을 불러올 수 없습니다: ${url}`)
    .then((html) => {
      target.innerHTML = html;
      rerunScripts(target);

      if (options.scroll) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 80;
        window.scrollTo({ top: offset, behavior: "smooth" });
      }
    })
    .catch((err) => {
      console.error("콘텐츠 로드 오류:", err);
      target.innerHTML = "<p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>";
    });
}

function initSideMenu() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  if (sideMenu.dataset.bound === "true") return;
  sideMenu.dataset.bound = "true";

  sideMenu.addEventListener("click", (e) => {
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault();

    const raw = link.getAttribute("data-content");
    if (!raw) return;

    const url = normalizeContentUrl(raw);

    loadHtmlInto("#main-content", url);

    // 사이드에서 본문이 바뀌어도 탑메뉴 active는 항상 동기화
    setTopMenuActiveByContent(url);

    sideMenu.querySelectorAll("a.side-link").forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
  });

  if (!sideMenu.querySelector("a.side-link.active")) {
    const firstLink = sideMenu.querySelector("a.side-link");
    if (firstLink) firstLink.classList.add("active");
  }
}