/* =========================================================
   include.js  (공통 스크립트)

   이 파일은 "모든 페이지에서 같이 사용하는" 자바스크립트입니다.

   하는 일 요약:
   1) 공통 header / (home이면 awesome 메뉴) / footer 를 자동 삽입
   2) app 모드일 때, 상단 메뉴(.navbar)의 data-menu 키값에 따라
        - 왼쪽 사이드 메뉴 : menu/menu-XXX.html
        - 본문 내용         : content/content-XXX.html
      을 각각 #left-menu, #main-content 에 로드
   3) index.html(app 모드)에서는 상단 메뉴 클릭 시
      페이지 이동(href)을 막고(=SPA처럼),
      좌측/본문 + 헤더만 교체한다.
   4) DETAILILLUST 페이지의 퀵메뉴(#quick)가 스크롤을 따라 움직이도록 한다.
   5) 사이드 메뉴 클릭 시 새 페이지 이동 없이 본문만 교체한다.
========================================================= */


/* ---------------------------------------------------------
   0. 공통 경로 설정 (폴더 위치를 한 곳에서 관리)
--------------------------------------------------------- */
const PATH = {
  header: "./common/header.html",          // 기본 헤더
  menu: "./menu/menu.html",               // 상단 메뉴(검정 메뉴바)
  footer: "./common/footer.html",         // 공통 푸터

  sideDir: "./menu/",                     // 왼쪽 사이드 메뉴 폴더
  contentDir: "./content/",               // 본문(content) 폴더

  // HOME(awesome) 전용
  awesomeMenu: "./menu/menu-awesome.html",
  homeContent: "./content/content-home.html",

  // 메뉴별 헤더(원하는 만큼 추가 가능)
  // ※ 실제 파일을 만들어야 합니다. (예: ./common/header-lectures.html)
  headerByMenu: {
    lectures: "./common/header-lectures.html",
    tagcloud: "./common/header-tagcloud.html",
    detailillust: "./common/header-detailillust.html",
    webcolor: "./common/header-webcolor.html",
    about: "./common/header-about.html"
  }
};


/* =========================================================
   1. 공통 유틸: 현재 페이지/모드 판별
========================================================= */
function getCurrentFileName() {
  return location.pathname.split("/").pop() || "index.html";
}

function isIndexPage() {
  const currentFile = getCurrentFileName();
  return currentFile === "index.html" || currentFile === "";
}

function getMode() {
  // index.html에서만 home/app 모드를 사용하고,
  // 다른 페이지(lectures.html 등)는 "page"로 취급합니다.
  if (!isIndexPage()) return "page";

  const params = new URLSearchParams(location.search);
  return params.get("mode") || "home"; // 기본은 home
}


/* =========================================================
   2. 화면 모드 전환 (HOME / APP)
   - home 모드 : #home-content만 보이게
   - app  모드 : #left-menu + #main-content 보이게
========================================================= */
function showHome() {
  const home = document.querySelector("#home-content");
  const left = document.querySelector("#left-menu");
  const main = document.querySelector("#main-content");

  if (home) home.style.display = "block";
  if (left) left.style.display = "none";
  if (main) main.style.display = "none";
}

function showApp() {
  const home = document.querySelector("#home-content");
  const left = document.querySelector("#left-menu");
  const main = document.querySelector("#main-content");

  if (home) home.style.display = "none";
  if (left) left.style.display = "block";
  if (main) main.style.display = "block";
}


/* =========================================================
   3. 공통 유틸: slot 기준으로 fragment 삽입
   - #header-slot 뒤(afterend), #nav-slot 뒤(afterend),
     #footer-slot 앞(beforebegin) 등에 사용
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
    if (!res.ok) return Promise.reject(errorMessage || ("불러오기 실패: " + url));
    return res.text();
  });
}


/* =========================================================
   4. 헤더만 교체하는 함수: loadHeader(url)
   - 기존에 삽입되어 있는 #site-header가 있으면 통째로 교체
   - 없으면(아직 미삽입) #header-slot 뒤에 삽입
   ※ 헤더 HTML의 루트 요소는 id="site-header"를 유지하세요.
========================================================= */
function loadHeader(url) {
  return fetchText(url, "헤더 파일을 불러올 수 없습니다: " + url)
    .then((html) => {
      const oldHeader = document.querySelector("#site-header");

      if (oldHeader) {
        // 기존 헤더가 있으면 → 통째로 교체
        oldHeader.outerHTML = html;
      } else {
        // 아직 없으면 → slot 기준으로 삽입
        insertHtmlAfterSlot("#header-slot", html);
      }
    })
    .catch((err) => console.error(err));
}

/* 메뉴키(menuKey) → 어떤 헤더 파일을 쓸지 결정 */
function getHeaderPathByMenuKey(menuKey) {
  return PATH.headerByMenu[menuKey] || PATH.header; // 없으면 기본 헤더
}


/* =========================================================
   5. DOMContentLoaded
   - header / nav(menu) / footer 를 삽입하고,
     app 모드면 좌측/본문 로드까지 수행
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (location.protocol === "file:") {
    console.error("file://로 열면 fetch include가 CORS로 차단됩니다. Live Server(HTTP)로 실행하세요.");
    document.body.innerHTML = `
      <div style="max-width:720px;margin:40px auto;font-family:system-ui;line-height:1.6">
        <h2>실행 방법 안내</h2>
        <p>이 프로젝트는 공통 파일을 <code>fetch()</code>로 불러오기 때문에
        <b>file://</b>로 열면 브라우저 보안 정책(CORS)으로 차단됩니다.</p>
        <p>VSCode에서 <b>Open with Live Server</b>로 실행해 주세요.</p>
      </div>
    `;
    return;
  }

  const params = new URLSearchParams(location.search);
  const mode = getMode();

  /* ---------- 1) 헤더 삽입(기본) ---------- */
  // (메뉴에 따라 헤더를 바꾸더라도, 우선 기본 헤더 1회 삽입)
  loadHeader(PATH.header);

  /* ---------- 2) 상단 메뉴 삽입 + home/app 분기 ---------- */
  if (mode === "home") {
    // HOME: awesome 메뉴 + 홈 콘텐츠
    showHome();

    fetchText(PATH.awesomeMenu, "menu-awesome.html 을 불러올 수 없습니다.")
      .then((html) => {
        insertHtmlAfterSlot("#nav-slot", html);
      })
      .catch((err) => console.error(err));

    // 홈 콘텐츠 로드
    // - loadHtmlInto를 사용하면 content-home.html 안의 <script>도 다시 실행됩니다.
    // - 홈 화면에서는 스크롤 이동이 불필요하므로 scroll:false로 설정합니다.
    loadHtmlInto("#home-content", PATH.homeContent, { scroll: false });

  } else {
    // APP 또는 다른 페이지: 기존 menu.html + 기존 로직
    showApp();

    fetchText(PATH.menu, "menu.html 을 불러올 수 없습니다.")
      .then((html) => {
        insertHtmlAfterSlot("#nav-slot", html);

        // (중요) menu.html이 DOM에 삽입된 다음에만 .navbar를 찾을 수 있습니다.
        bindTopMenuForIndexApp();

        // index.html?mode=app&menu=XXX 로 들어온 경우:
        //  - active를 강제로 지정
        //  - 좌측/본문 로드
        //  - 헤더도 메뉴에 맞게 교체
        const menuKey = params.get("menu");
        if (isIndexPage() && mode === "app" && menuKey) {
          setActiveTopMenuByKey(menuKey);
          loadSideAndContent(menuKey);
          loadHeader(getHeaderPathByMenuKey(menuKey));
        } else {
          // 일반 페이지(lectures.html 등) 또는 index.html(app이지만 menu 파라미터 없음)
          initTopMenuActive();
          loadSideAndContent();

          // (선택) 일반 페이지에서도 현재 active 메뉴에 맞춰 헤더를 교체하고 싶다면 사용
          const active = document.querySelector(".navbar a.active");
          const key = active?.dataset?.menu;
          if (key) {
            loadHeader(getHeaderPathByMenuKey(key));
          }
        }
      })
      .catch((err) => console.error(err));
  }

  /* ---------- 3) 푸터 삽입 ---------- */
  fetchText(PATH.footer, "footer.html 을 불러올 수 없습니다.")
    .then((html) => {
      insertHtmlBeforeSlot("#footer-slot", html);
    })
    .catch((err) => console.error(err));

  /* ---------- 4) 뒤로가기/앞으로가기(popstate) 대응 (선택) ---------- */
  // index.html(app 모드)에서 history.pushState를 쓰므로,
  // 뒤로/앞으로 이동 시에도 헤더/본문이 URL에 맞게 바뀌도록 처리합니다.
  window.addEventListener("popstate", () => {
    if (!isIndexPage()) return;

    const p = new URLSearchParams(location.search);
    const m = p.get("mode") || "home";

    if (m === "home") {
      showHome();
      loadHtmlInto("#home-content", PATH.homeContent, { scroll: false });
      // 홈에서 헤더도 기본으로 되돌리고 싶다면:
      loadHeader(PATH.header);
      return;
    }

    // app 모드
    showApp();
    const menuKey = p.get("menu");
    if (menuKey) {
      setActiveTopMenuByKey(menuKey);
      loadSideAndContent(menuKey);
      loadHeader(getHeaderPathByMenuKey(menuKey));
    }
  });
});


/* =========================================================
   6. initTopMenuActive()
   - 현재 열려 있는 페이지 이름(lectures.html 등)에 따라
     상단 메뉴(.navbar)의 해당 <a>에 .active를 붙입니다.
========================================================= */
function initTopMenuActive() {
  const current = getCurrentFileName();

  document.querySelectorAll(".navbar a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) {
      a.classList.add("active");
    }
  });

  // 아무 것도 active가 없으면 index.html 링크를 기본 active로
  if (!document.querySelector(".navbar a.active")) {
    document
      .querySelectorAll('.navbar a[href="index.html"]')
      .forEach((a) => a.classList.add("active"));
  }
}

/* data-menu 키로 active를 강제 지정 */
function setActiveTopMenuByKey(menuKey) {
  const links = document.querySelectorAll(".navbar a[data-menu]");
  links.forEach((a) => a.classList.remove("active"));

  const target = document.querySelector(`.navbar a[data-menu="${menuKey}"]`);
  if (target) target.classList.add("active");
}


/* =========================================================
   7. index.html(app 모드)에서 상단 메뉴 클릭을 SPA처럼 처리
   - 페이지 이동(href)을 막고,
     좌측/본문 + 헤더만 교체
========================================================= */
function bindTopMenuForIndexApp() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  // 이벤트 중복 방지
  if (navbar.dataset.bound === "true") return;
  navbar.dataset.bound = "true";

  navbar.addEventListener("click", (e) => {
    const link = e.target.closest('a.menuLink[data-menu]');
    if (!link) return;

    // index.html + app 모드에서만 기본 이동을 막습니다.
    const mode = getMode();
    if (!(isIndexPage() && mode === "app")) return;

    e.preventDefault();

    const menuKey = link.dataset.menu;
    if (!menuKey) return;

    // 1) active 표시
    setActiveTopMenuByKey(menuKey);

    // 2) 좌측/본문 교체
    loadSideAndContent(menuKey);

    // 3) 헤더만 교체
    loadHeader(getHeaderPathByMenuKey(menuKey));

    // 4) URL 갱신(새로고침/공유/뒤로가기 대응)
    history.pushState(null, "", `index.html?mode=app&menu=${encodeURIComponent(menuKey)}`);
  });
}


/* =========================================================
   8. loadSideAndContent(menuKeyOverride)
   - active 메뉴의 data-menu(또는 override)를 이용하여
     menu-XXX.html / content-XXX.html을 로드합니다.
========================================================= */
function loadSideAndContent(menuKeyOverride) {
  const leftMenuBox = document.getElementById("left-menu");
  const mainContentBox = document.getElementById("main-content");
  if (!leftMenuBox || !mainContentBox) return;

  let menuKey = menuKeyOverride;

  if (!menuKey) {
    const activeLink = document.querySelector(".navbar a.active");
    if (!activeLink) return;
    menuKey = activeLink.dataset.menu;
  }

  if (!menuKey) return;

  const sideUrl = PATH.sideDir + `menu-${menuKey}.html`;
  const contentUrl = PATH.contentDir + `content-${menuKey}.html`;

  /* ---------- 8-1) 왼쪽 사이드 메뉴 로드 ---------- */
  fetchText(sideUrl, "사이드 메뉴 파일이 없습니다.")
    .then((html) => {
      leftMenuBox.innerHTML = html;
      initSideMenu();
    })
    .catch((err) => {
      console.error("사이드메뉴 로드 실패:", err);
      leftMenuBox.innerHTML = "<p>사이드 메뉴를 불러올 수 없습니다.</p>";
    });

  /* ---------- 8-2) 본문 내용 로드 ---------- */
  fetchText(contentUrl, "본문 파일이 없습니다.")
    .then((html) => {
      mainContentBox.innerHTML = html;

      // fetch + innerHTML로 넣은 <script>는 자동 실행되지 않으므로 재실행 처리
      const scripts = mainContentBox.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");

        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }

        if (oldScript.type) {
          newScript.type = oldScript.type;
        }

        document.body.appendChild(newScript);
        oldScript.remove();
      });

      initFloatingQuickMenu();
    })
    .catch((err) => {
      console.error("본문 로드 실패:", err);
      mainContentBox.innerHTML = "<p>본문 내용을 불러올 수 없습니다.</p>";
    });
}


/* =========================================================
   9. 떠다니는 퀵메뉴 초기화 (DETAILILLUST 전용)
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


/* =========================================================
   10. loadHtmlInto(targetSelector, url, options)
   - 외부 HTML을 target에 삽입하고, 내부 <script>를 재실행합니다.
   - options.scroll (기본 true)
     true  : 삽입 후 target 상단으로 스크롤 이동
     false : 스크롤 이동 없음(홈 콘텐츠 로딩 등)
========================================================= */
function loadHtmlInto(targetSelector, url, options = { scroll: true }) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn("loadHtmlInto: 대상 요소를 찾을 수 없습니다 →", targetSelector);
    return;
  }

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        return Promise.reject("요청한 파일을 불러올 수 없습니다. (" + response.status + ")");
      }
      return response.text();
    })
    .then((html) => {
      target.innerHTML = html;

      // <script> 재실행
      const scripts = target.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");

        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }

        if (oldScript.type) {
          newScript.type = oldScript.type;
        }

        document.body.appendChild(newScript);
        oldScript.remove();
      });

      // 스크롤 옵션
      if (options.scroll) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 80;
        window.scrollTo({ top: offset, behavior: "smooth" });
      }
    })
    .catch((err) => {
      console.error("콘텐츠 로드 중 오류:", err);
      target.innerHTML = "<p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>";
    });
}


/* =========================================================
   11. initSideMenu()
   - 왼쪽 사이드 메뉴 클릭 시, 새 페이지 이동 없이 본문만 교체
========================================================= */
function initSideMenu() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  sideMenu.addEventListener("click", (e) => {
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault();

    let url = link.getAttribute("data-content");
    if (!url) return;

    if (!url.includes("/")) {
      url = PATH.contentDir + url;
    }

    loadHtmlInto("#main-content", url);

    sideMenu.querySelectorAll("a.side-link").forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
  });

  if (!sideMenu.querySelector("a.side-link.active")) {
    const firstLink = sideMenu.querySelector("a.side-link");
    if (firstLink) firstLink.classList.add("active");
  }
}
