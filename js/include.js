/* =========================================================
   include.js  (공통 스크립트)

   - index.html, detailillust.html, lectures.html 등
     모든 페이지에서 공통으로 사용하는 JS 입니다.

   - 하는 일 요약
     1) common/header.html, menu/menu.html, common/footer.html 자동 삽입
     2) 현재 페이지에 맞게 상단 메뉴(.active) 표시
     3) 상단 메뉴 상태에 따라
          • 왼쪽 사이드 메뉴 : menu/menu-XXX.html
          • 본문 내용       : content/content-XXX.html
        을 #left-menu, #main-content 에 자동 로드
     4) DETAILILLUST 페이지의 떠다니는 퀵메뉴(#quick) 동작
     5) 사이드 메뉴 클릭 시 본문 교체 (content 폴더 기준)

   (여기서 XXX는 lectures, tagcloud, detailillust, webcolor, about 등
    상단 메뉴의 data-menu 값과 일치해야 합니다.)
   ========================================================= */

/* ---------------------------------------------------------
   0. 공통 경로 설정
   - 폴더 구조가 바뀌더라도 이 부분만 고치면 전체가 같이 바뀝니다.
   --------------------------------------------------------- */
const PATH = {
  header: "./common/header.html",
  menu: "./menu/menu.html",
  footer: "./common/footer.html",
  sideDir: "./menu/",      // menu-XXX.html 이 들어있는 폴더
  contentDir: "./content/" // content-XXX.html 이 들어있는 폴더
};


/* =========================================================
   1. DOMContentLoaded
      - HTML 뼈대(태그)가 모두 만들어진 직후에 실행되는 이벤트
      - 이 시점에 header / menu / footer 를 가져와서 끼워 넣고,
        그 후에 왼쪽 메뉴 + 본문도 자동으로 로딩합니다.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- 1) 헤더 삽입 ---------- */
  fetch(PATH.header)
    .then((res) => {
      if (!res.ok) {
        return Promise.reject("header.html 을 불러올 수 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      const slot = document.querySelector("#header-slot");
      if (slot) {
        // 기준점 div 바로 뒤(afterend)에 header.html 삽입
        slot.insertAdjacentHTML("afterend", html);
      }
    })
    .catch((err) => {
      console.error(err);
    });

  /* ---------- 2) 상단 메뉴(navbar) 삽입 ---------- */
  fetch(PATH.menu)
    .then((res) => {
      if (!res.ok) {
        return Promise.reject("menu.html 을 불러올 수 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      const navSlot = document.querySelector("#nav-slot");
      if (navSlot) {
        navSlot.insertAdjacentHTML("afterend", html);
      }

      // 상단 메뉴 HTML이 삽입된 뒤에 active 표시 및
      // 왼쪽 메뉴 + 본문 로드를 진행
      initTopMenuActive();
      loadSideAndContent();
    })
    .catch((err) => {
      console.error(err);
    });

  /* ---------- 3) 푸터 삽입 ---------- */
  fetch(PATH.footer)
    .then((res) => {
      if (!res.ok) {
        return Promise.reject("footer.html 을 불러올 수 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      const slot = document.querySelector("#footer-slot");
      if (slot) {
        // footer는 기준점 div "앞(beforebegin)"에 삽입
        slot.insertAdjacentHTML("beforebegin", html);
      }
    })
    .catch((err) => {
      console.error(err);
    });
});


/* =========================================================
   2. initTopMenuActive()
      - 현재 주소(예: lectures.html)에 해당하는 상단 메뉴에
        .active 클래스를 붙여 줍니다.
   ========================================================= */
function initTopMenuActive() {
  // 예: "/HTML/detailillust.html" → "detailillust.html" 만 뽑기
  const current = location.pathname.split("/").pop() || "index.html";

  // .navbar 안의 모든 링크 순회
  document.querySelectorAll(".navbar a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) {
      a.classList.add("active");
    }
  });

  // 혹시 아무 것도 active 가 안 되었으면 index.html을 기본값으로 처리
  if (!document.querySelector(".navbar a.active")) {
    document
      .querySelectorAll('.navbar a[href="index.html"]')
      .forEach((a) => a.classList.add("active"));
  }
}


/* =========================================================
   3. loadSideAndContent()
      - 현재 활성화된 상단 메뉴(<a class="active">)의 data-menu 값을 읽어서
          • 왼쪽 사이드 메뉴  → menu/menu-XXX.html
          • 본문 내용         → content/content-XXX.html
        을 각각 #left-menu, #main-content 영역에 넣어 줍니다.
   ========================================================= */
function loadSideAndContent() {
  const leftMenuBox = document.getElementById("left-menu");      // 왼쪽 사이드 영역
  const mainContentBox = document.getElementById("main-content"); // 본문 영역
  if (!leftMenuBox || !mainContentBox) return;

  // 상단 메뉴 중 .active 가 붙어 있는 <a> 찾기
  const activeLink = document.querySelector(".navbar a.active");
  if (!activeLink) return;

  // data-menu 속성 값 읽기 (예: data-menu="detailillust")
  const menuKey = activeLink.dataset.menu;
  if (!menuKey) return;

  // 실제로 읽어 올 파일 경로 만들기
  const sideUrlFile = `menu-${menuKey}.html`;       // 예: menu-detailillust.html
  const contentUrlFile = `content-${menuKey}.html`; // 예: content-detailillust.html

  const sideUrl = PATH.sideDir + sideUrlFile;          // menu/menu-detailillust.html
  const contentUrl = PATH.contentDir + contentUrlFile; // content/content-detailillust.html

  /* ---------- 3-1) 왼쪽 사이드 메뉴 로드 ---------- */
  fetch(sideUrl)
    .then((res) => {
      if (!res.ok) {
        return Promise.reject("사이드 메뉴 파일이 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      // #left-menu 안을 교체
      leftMenuBox.innerHTML = html;

      // 새로 삽입된 사이드 메뉴에 클릭 이벤트 연결
      initSideMenu();
    })
    .catch((err) => {
      console.error("사이드메뉴 로드 실패:", err);
      leftMenuBox.innerHTML = "<p>사이드 메뉴를 불러올 수 없습니다.</p>";
    });

  /* ---------- 3-2) 본문 내용 로드 ---------- */
  fetch(contentUrl)
    .then((res) => {
      if (!res.ok) {
        // 파일이 없으면 에러로 처리
        return Promise.reject("본문 파일이 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      // #main-content 안의 내용을 교체
      mainContentBox.innerHTML = html;

      /* --- 3-2-a) 본문 안의 <script> 다시 실행시키기 ---
         fetch 로 가져온 HTML 안에 <script> 가 있을 때,
         innerHTML 로 넣으면 스크립트가 자동 실행되지 않습니다.
         아래 과정은 <script> 태그들을 새로 만들어 다시 붙여서
         원래 하던 동작(예: 확대 이미지, 애니메이션 등)을 살려 주는 부분입니다.
      */
      const scripts = mainContentBox.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");

        if (oldScript.src) {
          // 외부 JS 파일을 읽어오는 경우
          newScript.src = oldScript.src;
        } else {
          // inline 스크립트인 경우
          newScript.textContent = oldScript.textContent;
        }

        if (oldScript.type) {
          newScript.type = oldScript.type;
        }

        // body 끝에 새 <script> 삽입해서 실행
        document.body.appendChild(newScript);

        // 기존 <script> 태그는 제거
        oldScript.remove();
      });

      // DETAILILLUST 페이지라면 퀵메뉴 초기화
      initFloatingQuickMenu();
    })
    .catch((err) => {
      console.error("본문 로드 실패:", err);
      mainContentBox.innerHTML = "<p>본문 내용을 불러올 수 없습니다.</p>";
    });
}


/* =========================================================
   4. 떠다니는 퀵메뉴 초기화 (detailillust 전용)
      - #quick 이라는 id 가진 요소가 있을 때만 동작
      - 스크롤 위치에 맞춰 서서히 따라오는 효과를 줍니다.
   ========================================================= */
function initFloatingQuickMenu() {
  const quick = document.getElementById("quick");
  if (!quick) return; // #quick 이 없으면 아무 것도 안 함

  // 같은 페이지에서 여러 번 initFloatingQuickMenu()가 호출되는 것을 방지
  if (quick.dataset.floatingInitialized === "true") return;
  quick.dataset.floatingInitialized = "true";

  // CSS에서 지정된 top 값을 기준으로 시작 위치를 계산
  const computedStyle = window.getComputedStyle(quick);
  const initialTop = parseInt(computedStyle.top, 10) || 150; // 기본값 150px
  let currentTop = initialTop;

  function update() {
    const scrollY = window.scrollY || window.pageYOffset;
    const targetTop = scrollY + initialTop; // 스크롤 위치 + 초기 오프셋

    // 부드럽게 따라오도록 보간(lerp) 사용
    currentTop += (targetTop - currentTop) * 0.15;
    quick.style.top = currentTop + "px";

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}


/* =========================================================
   5. 공통 유틸 : loadHtmlInto(targetSelector, url)
      - 지정한 선택자 위치에 외부 HTML 파일을 읽어서 그대로 넣어 줍니다.
      - 현재는 사이드 메뉴 클릭 시 본문 교체에 사용합니다.
   ========================================================= */
function loadHtmlInto(targetSelector, url) {
  // 1) 먼저 목적지 요소(#main-content 등)를 찾습니다.
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn("loadHtmlInto: 대상 요소를 찾을 수 없습니다 →", targetSelector);
    return;
  }

  // 2) 외부 HTML 파일을 가져옵니다.
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        // 404, 500 등의 오류 코드일 때
        return Promise.reject(
          "요청한 파일을 불러올 수 없습니다. (" + response.status + ")"
        );
      }
      return response.text();
    })
    .then((html) => {
      // 3) 내용을 교체합니다.
      target.innerHTML = html;

      // 4) 새로 삽입된 내용 안에 <script> 가 있다면 다시 실행해 줍니다.
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

      // 5) 본문을 교체한 뒤, 화면을 본문 상단으로 부드럽게 스크롤
      const rect = target.getBoundingClientRect();
      const offset = window.pageYOffset + rect.top - 80; // 헤더 높이만큼 위로
      window.scrollTo({ top: offset, behavior: "smooth" });
    })
    .catch((err) => {
      console.error("콘텐츠 로드 중 오류:", err);
      target.innerHTML = "<p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>";
    });
}


/* =========================================================
   6. initSideMenu()
      - 왼쪽 사이드 메뉴(DETAILILLUST 등)의 클릭 이벤트를 처리합니다.
      - 각 링크의 data-content 값을 읽어
        content 폴더 안의 HTML 을 #main-content 에 로드합니다.
   ========================================================= */
function initSideMenu() {
  // .side-menu 또는 .side-menu-detail 중 하나를 찾습니다.
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  sideMenu.addEventListener("click", (e) => {
    // 클릭된 곳이 <a> 안쪽의 span 이더라도, 가장 가까운 a.side-link 를 찾는다.
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault(); // 링크의 기본 이동(새 페이지로 이동)을 막기

    let url = link.getAttribute("data-content"); // 예: content-detailillust-02.html
    if (!url) return;

    // 만약 경로에 슬래시(/)가 없다면, content/ 폴더를 자동으로 붙여 준다.
    // - data-content="content-detailillust-02.html"  → content/content-detailillust-02.html
    // - data-content="content/content-detailillust-02.html" 처럼 이미 폴더가 있으면 그대로 사용
    if (!url.includes("/")) {
      url = PATH.contentDir + url;
    }

    // 본문 영역에 HTML 로드
    loadHtmlInto("#main-content", url);

    // 선택된 사이드 메뉴에 .active 클래스 붙이기 (시각적인 강조)
    sideMenu.querySelectorAll("a.side-link").forEach((a) => {
      a.classList.remove("active");
    });
    link.classList.add("active");
  });
}
