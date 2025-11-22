/* =========================================================
   include.js  (공통 스크립트)

   이 파일은 "모든 페이지에서 같이 사용하는" 자바스크립트입니다.

   하는 일 요약:
   1) 공통 header.html, menu.html, footer.html 을 자동으로 끼워 넣는다.
   2) 현재 열려 있는 파일 이름(예: lectures.html)에 맞춰
      상단 메뉴에서 해당 항목에 .active 클래스를 붙인다.
   3) .active 가 붙은 상단 메뉴의 data-menu 값을 읽어서
        - 왼쪽 사이드 메뉴 : menu/menu-XXX.html
        - 본문 내용         : content/content-XXX.html
      을 각각 #left-menu, #main-content 에 로드한다.
   4) DETAILILLUST 페이지에서, 왼쪽에 떠 있는 퀵메뉴(#quick)가
      스크롤을 따라 부드럽게 움직이도록 만든다.
   5) 왼쪽 사이드 메뉴를 클릭하면, 같은 페이지 안에서 본문만 교체된다.
      (새 페이지로 이동하지 않고, content 폴더 안 HTML을 불러와서 바꿔 끼우기)
   ========================================================= */


/* ---------------------------------------------------------
   0. 공통 경로 설정 (폴더 위치를 한 곳에서 관리)
   - 프로젝트 폴더 구조가 바뀌더라도, 아래 경로만 고치면 전체가 같이 바뀝니다.
   --------------------------------------------------------- */
const PATH = {
  header: "./common/header.html", // 공통 헤더 파일
  menu: "./menu/menu.html",      // 상단 메뉴(탑 메뉴) 파일
  footer: "./common/footer.html",// 공통 푸터 파일

  sideDir: "./menu/",            // 왼쪽 사이드 메뉴 HTML 이 들어있는 폴더
  contentDir: "./content/"       // 본문 내용 HTML 이 들어있는 폴더
};


/* =========================================================
   1. DOMContentLoaded
   - HTML 태그(뼈대)가 모두 만들어진 직후에 실행되는 이벤트입니다.
   - 이 시점에 header / menu / footer 를 서버에서 가져와서
     index.html 의 지정된 위치에 끼워 넣습니다.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- 1) 헤더 삽입 ---------- */
  fetch(PATH.header)
    .then((res) => {
      if (!res.ok) {
        // header.html 파일이 없거나 오류가 난 경우
        return Promise.reject("header.html 을 불러올 수 없습니다.");
      }
      return res.text(); // 응답 본문을 텍스트(HTML 문자열)로 받기
    })
    .then((html) => {
      // index.html 안에서 헤더를 끼워 넣을 기준점 요소 찾기
      const slot = document.querySelector("#header-slot");
      if (slot) {
        // 기준점 div 바로 "뒤(afterend)"에 header.html 내용을 삽입
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
        // navSlot 바로 뒤에 상단 메뉴 HTML 삽입
        navSlot.insertAdjacentHTML("afterend", html);
      }

      // 상단 메뉴 HTML이 실제로 삽입된 "이후"에
      // (1) 어떤 메뉴가 active 인지 표시하고
      // (2) 그에 맞춰 왼쪽 메뉴 + 본문도 로딩
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
        // footer-slot 바로 "앞(beforebegin)"에 footer.html 내용을 삽입
        // (slot 자체는 나중에 빈 껍데기 역할)
        slot.insertAdjacentHTML("beforebegin", html);
      }
    })
    .catch((err) => {
      console.error(err);
    });
});


/* =========================================================
   2. initTopMenuActive()
   - 현재 열려 있는 페이지 이름에 따라, 상단 메뉴(.navbar) 안에서
     해당하는 <a> 태그에 .active 를 붙여주는 함수입니다.
   ========================================================= */
function initTopMenuActive() {
  // 예) "C:/.../HTML/detailillust.html" → "detailillust.html" 만 추출
  const current = location.pathname.split("/").pop() || "index.html";

  // .navbar 안의 모든 링크를 하나씩 검사
  document.querySelectorAll(".navbar a").forEach((a) => {
    const href = a.getAttribute("href"); // 예: "detailillust.html"
    if (href === current) {
      // 현재 페이지와 링크의 href 가 같으면 .active 클래스 추가
      a.classList.add("active");
    }
  });

  // 혹시 아무 것도 active 가 안 되었으면
  // → index.html 링크를 기본 active 로 설정
  if (!document.querySelector(".navbar a.active")) {
    document
      .querySelectorAll('.navbar a[href="index.html"]')
      .forEach((a) => a.classList.add("active"));
  }
}


/* =========================================================
   3. loadSideAndContent()
   - 상단 메뉴에서 active 가 붙은 항목을 찾아서
     1) 왼쪽 사이드 메뉴 HTML (menu/menu-XXX.html)
     2) 본문 내용 HTML       (content/content-XXX.html)
     을 각각 로드하여 #left-menu, #main-content 에 끼워 넣습니다.
   ========================================================= */
function loadSideAndContent() {
  const leftMenuBox = document.getElementById("left-menu");      // 왼쪽 사이드 영역
  const mainContentBox = document.getElementById("main-content"); // 본문 영역
  if (!leftMenuBox || !mainContentBox) return; // 두 요소 중 하나라도 없으면 중단

  // 상단 메뉴 중 .active 가 붙어 있는 <a> 찾기
  const activeLink = document.querySelector(".navbar a.active");
  if (!activeLink) return;

  // data-menu 속성 값 읽기 (예: data-menu="detailillust")
  const menuKey = activeLink.dataset.menu;
  if (!menuKey) return;

  // 실제로 읽어 올 파일 이름 구성
  const sideUrlFile = `menu-${menuKey}.html`;       // 예: menu-detailillust.html
  const contentUrlFile = `content-${menuKey}.html`; // 예: content-detailillust.html

  // 경로 상수(PATH)를 이용해 최종 경로 만들기
  const sideUrl = PATH.sideDir + sideUrlFile;          // 예: ./menu/menu-detailillust.html
  const contentUrl = PATH.contentDir + contentUrlFile; // 예: ./content/content-detailillust.html

  /* ---------- 3-1) 왼쪽 사이드 메뉴 로드 ---------- */
  fetch(sideUrl)
    .then((res) => {
      if (!res.ok) {
        return Promise.reject("사이드 메뉴 파일이 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      // 왼쪽 메뉴 영역 전체를 새 HTML로 교체
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
        return Promise.reject("본문 파일이 없습니다.");
      }
      return res.text();
    })
    .then((html) => {
      // 본문 영역 전체를 새 HTML로 교체
      mainContentBox.innerHTML = html;

      /* --- 3-2-a) 본문 안의 <script> 다시 실행시키기 ---
         - fetch + innerHTML 로 넣은 <script> 태그는 자동 실행되지 않습니다.
         - 따라서, 스크립트 내용을 새 <script> 로 복사해서 body 끝에 다시 붙여
           원래 하던 동작(예: 이미지 확대, 애니메이션 등)을 복원해 줍니다.
      */
      const scripts = mainContentBox.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");

        if (oldScript.src) {
          // <script src="..."> 형태인 경우
          newScript.src = oldScript.src;
        } else {
          // <script> 안에 직접 코드가 들어있는 경우
          newScript.textContent = oldScript.textContent;
        }

        if (oldScript.type) {
          newScript.type = oldScript.type;
        }

        // 새 스크립트를 body 끝에 붙여서 실행
        document.body.appendChild(newScript);

        // 기존 <script> 태그는 DOM에서 제거
        oldScript.remove();
      });

      // DETAILILLUST 페이지라면 퀵메뉴(Quick Menu) 초기화
      initFloatingQuickMenu();
    })
    .catch((err) => {
      console.error("본문 로드 실패:", err);
      mainContentBox.innerHTML = "<p>본문 내용을 불러올 수 없습니다.</p>";
    });
}


/* =========================================================
   4. 떠다니는 퀵메뉴 초기화 (DETAILILLUST 전용)
   - #quick 이라는 id 를 가진 요소가 있을 때만 동작합니다.
   - 스크롤을 내리면 메뉴가 부드럽게 따라오는 효과를 줍니다.
   ========================================================= */
function initFloatingQuickMenu() {
  const quick = document.getElementById("quick");
  if (!quick) return; // #quick 요소가 없으면 아무 것도 하지 않음

  // 같은 페이지에서 여러 번 initFloatingQuickMenu()가 호출되는 것을 방지
  if (quick.dataset.floatingInitialized === "true") return;
  quick.dataset.floatingInitialized = "true";

  // CSS 에서 지정된 top 값을 기준으로 시작 위치 계산
  const computedStyle = window.getComputedStyle(quick);
  const initialTop = parseInt(computedStyle.top, 10) || 150; // top 값이 없으면 기본 150px
  let currentTop = initialTop;

  function update() {
    const scrollY = window.scrollY || window.pageYOffset;
    const targetTop = scrollY + initialTop; // 스크롤 위치 + 초기 오프셋

    // (현재 위치 → 목표 위치)를 15%씩만 따라가게 해서 부드러운 느낌 만들기
    currentTop += (targetTop - currentTop) * 0.15;
    quick.style.top = currentTop + "px";

    requestAnimationFrame(update); // 다음 화면 그리기 전에 다시 호출
  }

  // 애니메이션 시작
  requestAnimationFrame(update);
}


/* =========================================================
   5. 공통 유틸 함수: loadHtmlInto(targetSelector, url)
      - 지정한 선택자 위치에 외부 HTML 파일을 읽어서 그대로 넣어 줍니다.
      - 현재는 사이드 메뉴 클릭 시, #main-content 안의 본문을 교체하는 데 사용합니다.
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
      - 왼쪽 사이드 메뉴(DETAILILLUST 등)에 클릭 이벤트를 연결합니다.
      - 각 링크의 data-content 속성을 읽어,
        content 폴더 안 HTML 파일을 #main-content 에 로드합니다.
   ========================================================= */
function initSideMenu() {
  // .side-menu 또는 .side-menu-detail 중 하나를 찾습니다.
  // (둘 중 존재하는 첫 번째 요소가 대상)
  const sideMenu = document.querySelector(".side-menu, .side-menu-detail");
  if (!sideMenu) return;

  sideMenu.addEventListener("click", (e) => {
    // 클릭된 곳이 <a> 안쪽의 <span> 이더라도, 가장 가까운 a.side-link 를 찾기
    const link = e.target.closest("a.side-link[data-content]");
    if (!link || !sideMenu.contains(link)) return;

    e.preventDefault(); // 링크의 기본 동작(페이지 이동)을 막기

    let url = link.getAttribute("data-content"); // 예: "content-detailillust-02.html"
    if (!url) return;

    // 경로 앞에 content/ 자동 붙이기 (슬래시가 없을 때만)
    // 예: "content-detailillust-02.html" → "./content/content-detailillust-02.html"
    if (!url.includes("/")) {
      url = PATH.contentDir + url;
    }

    // ▶ 본문 교체
    loadHtmlInto("#main-content", url);

    // ▶ 사이드 메뉴에서 "선택된 항목" 표시 (.active)
    sideMenu.querySelectorAll("a.side-link").forEach((a) => {
      a.classList.remove("active");
    });
    link.classList.add("active");
  });

  // 페이지가 처음 로드되었을 때, 아직 active 가 없다면
  // 사이드 메뉴의 첫 번째 항목에 active 부여
  if (!sideMenu.querySelector("a.side-link.active")) {
    const firstLink = sideMenu.querySelector("a.side-link");
    if (firstLink) {
      firstLink.classList.add("active");
    }
  }
}