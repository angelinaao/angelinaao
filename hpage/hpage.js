const landingImage = document.querySelector('.landing-default');
const largeTitle = document.querySelector('.large-title');
const smallTitle = document.querySelector('.small-title');

let activeMode = null; // 'photography' | 'graphicdesign' | null

const IMAGE_DURATION = 1100; // ms each carousel image stays on screen

// Resolves once an image is downloaded and decoded, so it can appear instantly
function whenReady(img) {
    return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
}

// On phones Safari paints the page's background colour in the strip above
// the page, so tint it to match the top edge of the photo on screen (only
// visible on phones; on desktop the photo covers the whole window).
const topColorCache = new Map();

function topEdgeColor(img) {
    if (topColorCache.has(img)) return topColorCache.get(img);
    let color = null;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 4;
        const ctx = canvas.getContext('2d');
        // top 3% of the photo, middle half of its width (what "cover" keeps)
        const w = img.naturalWidth, h = img.naturalHeight;
        ctx.drawImage(img, w * 0.25, 0, w * 0.5, Math.max(1, h * 0.03), 0, 0, 16, 4);
        const data = ctx.getImageData(0, 0, 16, 4).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2];
        }
        const n = data.length / 4;
        color = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
    } catch (e) {
        // unreadable (e.g. opened as a local file): keep the black fallback
    }
    topColorCache.set(img, color);
    return color;
}

function matchTopStrip(img) {
    const apply = () => {
        const color = topEdgeColor(img);
        if (color) document.documentElement.style.backgroundColor = color;
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
}

function createCarouselController(triggerEl, imageSelector) {
    const images = document.querySelectorAll(imageSelector);
    let currentIndex = 0;
    let timerId = null;
    let runId = 0;
    let resetTimeoutId = null;

    // Start loading and decoding every image now, before the first hover
    images.forEach((img) => whenReady(img));

    function resetImages() {
        images.forEach((img) => {
            img.classList.remove('active');
            img.style.zIndex = 0;
        });
        currentIndex = 0;
    }

    function showImage(index) {
        const nextIndex = index % images.length;
        const currentImage = images[currentIndex];
        const nextImage = images[nextIndex];

        // Show next image on top
        nextImage.style.zIndex = 3;
        nextImage.classList.add('active');
        matchTopStrip(nextImage);

        // Hide current image underneath
        setTimeout(() => {
            currentImage.style.zIndex = 2;
            currentImage.classList.remove('active');
        }, 50);

        currentIndex = nextIndex;
    }

    function start() {
        triggerEl.classList.add('active');

        // Hide landing image and large title
        landingImage.style.opacity = '0';
        largeTitle.style.opacity = '0';

        // Show small title
        smallTitle.classList.add('visible');

        // Cancel a pending reset from a quick re-hover so it can't blank the
        // first image partway through its turn, then start clean from image 1
        if (resetTimeoutId) {
            clearTimeout(resetTimeoutId);
            resetTimeoutId = null;
        }
        resetImages();

        // Show first carousel image
        images[0].style.zIndex = 3;
        images[0].classList.add('active');
        matchTopStrip(images[0]);

        // Start cycling through images
        // (the first image's clock also only starts once it has loaded)
        const run = ++runId;
        whenReady(images[0]).then(() => {
            if (run === runId) scheduleNext(run);
        });
    }

    // Each image gets its full time on screen: wait the duration AND for the
    // next image to finish loading, then swap. On the first loop a slow image
    // delays the swap instead of cutting its own turn short.
    function scheduleNext(run) {
        const nextIndex = (currentIndex + 1) % images.length;
        const nextReady = whenReady(images[nextIndex]);
        const timeUp = new Promise((resolve) => {
            timerId = setTimeout(resolve, IMAGE_DURATION);
        });

        Promise.all([nextReady, timeUp]).then(() => {
            if (run !== runId) return; // stopped or restarted meanwhile
            showImage(nextIndex);
            scheduleNext(run);
        });
    }

    function stop() {
        triggerEl.classList.remove('active');

        runId++;
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }

        resetTimeoutId = setTimeout(() => {
            resetTimeoutId = null;
            resetImages();
        }, 100);
    }

    return { start, stop };
}

const photographyTrigger = document.getElementById('photography-trigger');
const graphicdesignTrigger = document.getElementById('graphicdesign-trigger');

const controllers = {
    photography: createCarouselController(photographyTrigger, '.photo-carousel'),
    graphicdesign: createCarouselController(graphicdesignTrigger, '.gd-carousel'),
};

function goBackHome() {
    if (activeMode) {
        controllers[activeMode].stop();
        activeMode = null;
    }

    // Show landing image and large title again
    landingImage.style.opacity = '1';
    largeTitle.style.opacity = '1';
    matchTopStrip(landingImage);

    // Hide small title
    smallTitle.classList.remove('visible');
}

function enterMode(mode) {
    if (activeMode === mode) return;

    // Switch straight from one mode's carousel to the other's
    if (activeMode) {
        controllers[activeMode].stop();
    }

    activeMode = mode;
    controllers[mode].start();
}

// Start carousel on hover
photographyTrigger.addEventListener('mouseenter', () => enterMode('photography'));
graphicdesignTrigger.addEventListener('mouseenter', () => enterMode('graphicdesign'));

// Navigate to the graphic design page on click
graphicdesignTrigger.addEventListener('click', () => {
    window.location.href = 'graphicdesign/graphic.html';
});

// Navigate to the photography page on click
photographyTrigger.addEventListener('click', () => {
    window.location.href = 'photography/photo.html';
});

matchTopStrip(landingImage);

// Don't stop carousel on mouse leave anymore
// Only stop when clicking the small "aa" title
smallTitle.addEventListener('click', goBackHome);
