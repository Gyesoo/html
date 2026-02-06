/* const swiper = new Swiper('.slider-wrapper', {
    loop: true,
    grabCursor: true,
    spaceBetween: 30,

    // If we need pagination
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: true
    },

    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },

    //Responsive breakpoints
    breakpoints: {
        0: {
            slidesPerView: 1
        },
        768: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        },
    }
}); */


/**
 * Swiper 초기화 로직을 별도 함수로 분리
 */
function createSwiperInstance(el) {
    // 중복 초기화 방지
    if (el.classList.contains('swiper-initialized')) return;

    const swiper = new Swiper(el, {
        loop: true,
        grabCursor: true,
        spaceBetween: 30,
        // 동적 로딩 대응
        observer: true,
        observeParents: true,
        
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        breakpoints: {
            0: { 
                slidesPerView: 1 
            },
            768: { 
                slidesPerView: 2 
            },
            1024: { 
                slidesPerView: 3 
            },
        }
    });

    // 강제 레이아웃 업데이트
    setTimeout(() => swiper.update(), 150);
}

/**
 * ResizeObserver: 요소의 실제 너비가 잡히는 순간을 포착
 */
const sliderWrapper = document.querySelector('.slider-wrapper');

if (sliderWrapper) {
    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
            // 너비가 0보다 커지는 순간(CSS 로드 및 렌더링 완료) 초기화 실행
            if (entry.contentRect.width > 0) {
                createSwiperInstance(sliderWrapper);
                ro.unobserve(sliderWrapper); // 초기화 후 감지 중단
            }
        }
    });

    ro.observe(sliderWrapper);
}

// 혹시 모를 상황을 대비해 기존 로직도 유지 (보수적 접근)
window.addEventListener('load', () => {
    const el = document.querySelector('.slider-wrapper');
    if (el) createSwiperInstance(el);
});