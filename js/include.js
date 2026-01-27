/* =========================================================
   include.js (공통 스크립트) - 정리/주석 강화 버전

   [페이지 구성 규칙]
   - camera.html / web.html / ... : "각 영역 전체 레이아웃" 페이지
   - 상단 메뉴   : ./menu/menu-KEY.html
   - 사이드 메뉴 : ./menu/menu-side-KEY.html
   - 본문        : ./content/content-KEY.html
   - 헤더        : ./common/header-KEY.html (없으면 ./common/header.html)
   - 푸터        : ./common/footer.html

   [index.html 모드]
   - index.html?mode=home : 홈 화면
   - index.html?mode=app&menu=camera : 앱(SPA처럼 동작) 화면

   ---------------------------------------------------------
   실행(적용) 순서 개요
   1) DOMContentLoaded 발생
   2) file:// 여부 체크 (fetch 차단 안내)
   3) mode 판단 (home/app/page)
   4) footer 로드 (공통)
   5) home이면 홈 구성 / app,page면 KEY로 헤더/상단/사이드/본문 로드
   6) 상단/사이드 메뉴 클릭 이벤트로 본문/화면 갱신
========================================================= */

/* =========================================================
   0) 경로(PATH) 설정 + 홈(선택 기능) 옵션
========================================================= */
const PATH = {
  // 헤더는 KEY별 파일이 있으면 우선 사용
  headerDefault: "./common/header.html",
  headerByKey: (key) => `./common/header-${key}.html`,

  // 푸터는 공통
  footer: "./common/footer.html",

  // KEY 기반 메뉴/본문
  topMenuByKey: (key) => `./menu/menu-${key}.html`,
  sideMenuByKey: (key) => `./menu/menu-side-${key}.html`,
  contentByKey: (key) => `./content/content-${key}.html`,

  // (선택) 홈 전용 리소스
  awesomeMenu: "./menu/menu-awesome.html",
  homeContent: "./content/content-home.html"
};

// 홈에서 아래 2개를 실제로 사용할지 여부(원하면 true로 유지)
const HOME_USE_AWESOME_MENU = true;
const HOME_USE_HOME_CONTENT = true;

/* =========================================================
   1) 페이지/모드/KEY 유틸 (주소에서 현재 상태를 얻는 함수들)
========================================================= */

/** 현재 파일명 반환: /path/camera.html -> "camera.html" */
function getCurrentFileName() {
  return location.pathname.split("/").pop() || "index.html";
}

/** index.html인지 여부 */
function isIndexPage() {
  const currentFile = getCurrentFileName();
  return currentFile === "index.html" || currentFile === "";
}

/** camera.html -> "camera" (확장자 제거 후 소문자) */
function getPageKey() {
  const file = (getCurrentFileName() || "index.html").toLowerCase();
  return file.replace(".html", "");
}

/**
 * index.html에서만 mode 사용:
 * - index.html?mode=home  -> "home"
 * - index.html?mode=app   -> "app"
 * - 그 외 페이지(camera.html 등) -> "page"
 */
function getMode() {
  if (!isIndexPage()) return "page";
  const params = new URLSearchParams(location.search);
  return params.get("mode") || "home";
}

/** index.html?mode=app&menu=camera -> "camera" (기본값 web) */
function getMenuKeyFromIndexApp(params) {
  return (params.get("menu") || "web").toLowerCase();
}

/* =========================================================
   2) DOM 조작 + Fetch 유틸 (중복 코드 제거용)
========================================================= */

/** 특정 슬롯(#header-slot 등) 뒤(afterend)에 HTML 문자열 삽입 */
function insertHtmlAfterSlot(slotSelector, html) {
  const slot = document.querySelector(slotSelector);
  if (!slot) return;
  slot.insertAdjacentHTML("afterend", html);
}

/** 특정 슬롯 앞(beforebegin)에 HTML 문자열 삽입 */
function insertHtmlBeforeSlot(slotSelector, html) {
  const slot = document.querySelector(slotSelector);
  if (!slot) return;
  slot.insertAdjacentHTML("beforebegin", html);
}

/**
 * 텍스트(HTML) 파일 로드
 * - fetch 실패/404면 reject로 빠지게 해서 .catch에서 처리 가능
 */
function fetchText(url, errorMessage) {
  return fetch(url).then((res) => {
    if (!res.ok) {
      return Promise.reject(errorMessage || `불러오기 실패: ${url} (status ${res.status})`);
    }
    return res.text();
  });
}

/**
 * innerHTML로 삽입한 <script>는 실행이 안 되는 경우가 많아서 재실행 처리.
 * - 주의: 동일 스크립트를 여러 번 로드하면 "중복 실행"될 수 있음.
 * - 본문을 교체하는 구조라면 꼭 필요한 경우에만 사용하세요.
 */
function rerunScripts(container) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");

    // src가 있으면 외부파일, 없으면 인라인 스크립트
    if (oldScript.src) newScript.src = oldScript.src;
    else newScript.textContent = oldScript.textContent;

    if (oldScript.type) newScript.type = oldScript.type;

    document.body.appendChild(newScript);
    oldScript.remove();
  });
}

/* =========================================================
   3) 화면 모드(Home/App) 토글
   - home: #home-content 보이기, #left-menu/#main-content 숨기기
   - app : #left-menu/#main-content 보이기, #home-content 숨기기
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
   4) 헤더 로드 (header-KEY 우선 -> 없으면 기본 헤더)
========================================================= */

/**
 * 헤더 HTML을 실제 DOM에 적용
 * - #site-header가 이미 있으면 교체
 * - 없으면 #header-slot 뒤에 삽입
 */
function applyHeaderHtml(html) {
  const oldHeader = document.querySelector("#site-header");
  if (oldHeader) oldHeader.outerHTML = html;
  else insertHtmlAfterSlot("#header-slot", html);
}

/**
 * header-KEY.html을 먼저 시도 -> 없으면 header.html 로드
 * - 여기서는 "한 번의 fetch로 바로 적용"하도록 중복 fetch를 제거함
 */
function loadHeaderByKey(key) {
  const candidateUrl = PATH.headerByKey(key);

  return fetch(candidateUrl)
    .then((res) => {
      if (res.ok) return res.text(); // header-KEY.html 존재
      // 없으면 기본 헤더로 fallback
      return fetchText(PATH.headerDefault, `헤더 파일을 불러올 수 없습니다: ${PATH.headerDefault}`);
    })
    .then((html) => {
      applyHeaderHtml(html);
    })
    .catch((err) => {
      console.error(err);
      // 마지막 안전장치: 기본 헤더라도 시도
      return fetchText(PATH.headerDefault).then(applyHeaderHtml).catch(console.error);
    });
}

/* =========================================================
   5) 상단/사이드/본문/푸터 로드 (KEY 기반)
========================================================= */

/**
 * 상단 메뉴 로드 후 "상단 메뉴 클릭 이벤트"를 바인딩
 * - 중복 삽입 방지: 기존 #topMenu 제거
 */
function loadTopMenuByKey(key) {
  const url = PATH.topMenuByKey(key);

  return fetchText(url, `상단 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      // 기존 상단 메뉴가 있으면 제거(중복 방지)
      document.getElementById("topMenu")?.remove();

      // #nav-slot 뒤에 삽입 (menu-KEY.html 안에 id="topMenu"가 있다고 가정)
      insertHtmlAfterSlot("#nav-slot", html);

      // 삽입된 메뉴에 클릭 이벤트 연결
      bindTopMenuClickHandler();
    })
    .catch(console.error);
}

/**
 * 사이드 메뉴 로드 후 사이드 메뉴 클릭 이벤트 바인딩
 */
function loadSideMenuByKey(key) {
  const left = document.getElementById("left-menu");
  if (!left) return Promise.resolve();

  const url = PATH.sideMenuByKey(key);

  return fetchText(url, `사이드 메뉴 파일이 없습니다: ${url}`)
    .then((html) => {
      left.innerHTML = html;
      initSideMenu(); // 사이드 메뉴 클릭 시 본문 교체 이벤트 연결
    })
    .catch((err) => {
      console.error(err);
      left.innerHTML = "<p>사이드 메뉴를 불러올 수 없습니다.</p>";
    });
}

/**
 * 본문(content-KEY.html) 로드
 */
function loadMainContentByKey(key) {
  const main = document.getElementById("main-content");
  if (!main) return Promise.resolve();

  const url = PATH.contentByKey(key);

  return fetchText(url, `본문 파일이 없습니다: ${url}`)
    .then((html) => {
      main.innerHTML = html;

      // 본문에 포함된 script 실행이 필요하면 재실행
      rerunScripts(main);

      // 본문 로드 후 퀵메뉴가 있으면 플로팅 초기화
      initFloatingQuickMenu();
    })
    .catch((err) => {
      console.error(err);
      main.innerHTML = "<p>본문 내용을 불러올 수 없습니다.</p>";
    });
}

/**
 * 푸터 로드 (공통)
 */
function loadFooter() {
  return fetchText(PATH.footer, "footer.html 을 불러올 수 없습니다.")
    .then((html) => insertHtmlBeforeSlot("#footer-slot", html))
    .catch(console.error);
}

/* =========================================================
   6) "한 번에 조립" 함수 (KEY로 화면 구성)
   - 헤더/상단/사이드/본문을 한 번에 로드
========================================================= */
function loadAllByKey(key) {
  // 헤더는 KEY별
  loadHeaderByKey(key);

  // 상단/사이드/본문
  // (상단은 로드 후 클릭 바인딩이 필요하므로 Promise 체계 유지)
  loadTopMenuByKey(key);
  loadSideMenuByKey(key);
  loadMainContentByKey(key);
}

/* =========================================================
   7) 상단 메뉴 클릭 처리(중복 함수 통합)
   - 1) index.html + app 모드에서: a.menuLink[data-key] => SPA처럼 KEY 변경(loadAllByKey)
   - 2) 어디서든: a.menuLink[data-content] => 본문만 교체(loadHtmlInto)
========================================================= */
function bindTopMenuClickHandler() {
  const topMenu = document.getElementById("topMenu");
  if (!topMenu) return;

  // 같은 메뉴에 이벤트가 여러 번 붙는 것을 방지
  if (topMenu.dataset.bound === "true") return;
  topMenu.dataset.bound = "true";

  topMenu.addEventListener("click", (e) => {
    // 가장 가까운 <a class="menuLink"> 찾기
    const link = e.target.closest("a.menuLink");
    if (!link) return;

    // (A) SPA KEY 이동: data-key="camera" 같은 형태
    const key = (link.dataset.key || "").toLowerCase();
    const mode = getMode();

    // index.html + app 모드일 때만 "페이지 이동 막고" SPA로 처리
    if (key && isIndexPage() && mode === "app") {
      e.preventDefault();
      history.pushState(null, "", `index.html?mode=app&menu=${encodeURIComponent(key)}`);
      loadAllByKey(key);
      return;
    }

    // (B) 본문 교체: data-content="content-camera-iso.html" 같은 형태
    const content = link.dataset.content;
    if (content) {
      e.preventDefault();

      let url = content;
      // "content/..." 폴더 경로가 없으면 자동으로 ./content/ 붙임
      if (!url.includes("/")) url = "./content/" + url;

      loadHtmlInto("#main-content", url);

      // active 표시(원하면 사용)
      topMenu.querySelectorAll("a.menuLink").forEach((a) => a.classList.remove("active"));
      link.classList.add("active");
      return;
    }

    // 위 두 케이스가 아니면, 기본 동작(href 이동)을 막지 않음
  });
}

/* =========================================================
   8) DOMContentLoaded (실제 시작점)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------------------------------------
     8-1) file:// 로 열었을 때 fetch 차단 안내
  ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     8-2) mode/params 판단
  ------------------------------------------------------- */
  const params = new URLSearchParams(location.search);
  const mode = getMode();

  // (선택) CSS에서 mode-app 클래스를 쓰는 경우 유지
  document.body.classList.toggle("mode-app", mode === "app");

  /* -------------------------------------------------------
     8-3) 푸터는 항상 로드(공통)
  ------------------------------------------------------- */
  loadFooter();

  /* -------------------------------------------------------
     8-4) index.html 처리 (home/app)
  ------------------------------------------------------- */
  if (isIndexPage()) {
    // (1) HOME 모드
    if (mode === "home") {
      setDisplayMode("home");

      // 홈 헤더는 기본 헤더 사용
      fetchText(PATH.headerDefault, `헤더 파일을 불러올 수 없습니다: ${PATH.headerDefault}`)
        .then(applyHeaderHtml)
        .catch(console.error);

      // 홈 상단 메뉴(awesome) - 선택
      if (HOME_USE_AWESOME_MENU) {
        fetchText(PATH.awesomeMenu, "menu-awesome.html 을 불러올 수 없습니다.")
          .then((html) => {
            document.getElementById("topMenu")?.remove();
            insertHtmlAfterSlot("#nav-slot", html);
            // 홈 메뉴에도 클릭 이벤트가 필요하면 여기서 bindTopMenuClickHandler() 호출 가능
          })
          .catch(console.error);
      }

      // 홈 본문 - 선택
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

    // (2) APP 모드
    setDisplayMode("app");

    const key = getMenuKeyFromIndexApp(params);
    loadAllByKey(key);

    // 뒤로/앞으로가기(popstate) 처리
    window.addEventListener("popstate", () => {
      const p = new URLSearchParams(location.search);
      const m = p.get("mode") || "home";

      if (m === "home") {
        // 홈으로 돌아가면 새로고침처럼 홈 상태를 확실히 복구
        location.href = "index.html?mode=home";
      } else {
        loadAllByKey(getMenuKeyFromIndexApp(p));
      }
    });

    return;
  }

  /* -------------------------------------------------------
     8-5) camera.html / web.html / ... 일반 페이지 처리
  ------------------------------------------------------- */
  setDisplayMode("app");

  const pageKey = getPageKey();
  loadAllByKey(pageKey);
});

/* =========================================================
   9) 기존 기능들 (퀵메뉴/본문 로드/사이드 클릭)
   - 기능은 유지하되, loadHtmlInto는 fetchText 활용하도록 정리
========================================================= */

/**
 * 퀵 메뉴 플로팅(스크롤을 따라 top값을 부드럽게 이동)
 * - #quick 요소가 존재할 때만 동작
 */
function initFloatingQuickMenu() {
  const quick = document.getElementById("quick");
  if (!quick) return;

  // 중복 초기화 방지
  if (quick.dataset.floatingInitialized === "true") return;
  quick.dataset.floatingInitialized = "true";

  const computedStyle = window.getComputedStyle(quick);
  const initialTop = parseInt(computedStyle.top, 10) || 150;
  let currentTop = initialTop;

  function update() {
    const scrollY = window.scrollY || window.pageYOffset;
    const targetTop = scrollY + initialTop;

    // 0.15는 따라가는 속도(값이 크면 더 빠르게 따라옴)
    currentTop += (targetTop - currentTop) * 0.15;

    quick.style.top = currentTop + "px";
    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/**
 * 특정 영역(targetSelector)에 HTML을 로드하여 삽입
 * - options.scroll=true이면 로드 후 해당 영역으로 스크롤 이동
 */
function loadHtmlInto(targetSelector, url, options = { scroll: true }) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  fetchText(url, `요청 파일을 불러올 수 없습니다: ${url}`)
    .then((html) => {
      target.innerHTML = html;
      rerunScripts(target);

      if (options.scroll) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 80; // 상단 여백 80px
        window.scrollTo({ top: offset, behavior: "smooth" });
      }
    })
    .catch((err) => {
      console.error("콘텐츠 로드 오류:", err);
      target.innerHTML = "<p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>";
    });
}

/**
 * 사이드 메뉴(menu-side-KEY.html) 안에서
 * <a class="side-link" data-content="..."> 클릭 시 본문만 교체
 */
function initSideMenu() {
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  // 중복 바인딩 방지
  if (sideMenu.dataset.bound === "true") return;
  sideMenu.dataset.bound = "true";

  sideMenu.addEventListener("click", (e) => {
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault();

    let url = link.getAttribute("data-content");
    if (!url) return;

    // 폴더 경로가 없으면 ./content/ 자동 보정
    if (!url.includes("/")) {
      url = "./content/" + url;
    }

    loadHtmlInto("#main-content", url);

    // active 표시
    sideMenu.querySelectorAll("a.side-link").forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
  });

  // 최초 active가 없으면 첫 번째 메뉴를 active로 표시(옵션 성격)
  if (!sideMenu.querySelector("a.side-link.active")) {
    const firstLink = sideMenu.querySelector("a.side-link");
    if (firstLink) firstLink.classList.add("active");
  }
}