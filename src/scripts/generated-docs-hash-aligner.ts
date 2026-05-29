const generatedDocsSelector = "[data-generated-docs]";

const currentHashId = () => {
  if (!window.location.hash) {
    return undefined;
  }
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
};

const alignGeneratedDocsHash = () => {
  const id = currentHashId();
  if (!id) {
    return;
  }
  const target = document.getElementById(id);
  if (!target || !target.closest(generatedDocsSelector)) {
    return;
  }
  const scrollPaddingTop =
    Number.parseFloat(
      window.getComputedStyle(document.documentElement).scrollPaddingTop,
    ) || 80;
  const top = target.getBoundingClientRect().top + window.scrollY - scrollPaddingTop;
  window.scrollTo({ top: Math.max(0, top) });
};

const scheduleGeneratedDocsHashAlignment = () => {
  window.requestAnimationFrame(alignGeneratedDocsHash);
  window.setTimeout(alignGeneratedDocsHash, 50);
  window.setTimeout(alignGeneratedDocsHash, 250);
};

const initGeneratedDocsHashAligner = () => {
  if (!document.querySelector(generatedDocsSelector)) {
    return;
  }
  scheduleGeneratedDocsHashAlignment();
  window.addEventListener("load", scheduleGeneratedDocsHashAlignment, {
    once: true,
  });
  window.addEventListener("astro:hydrate", scheduleGeneratedDocsHashAlignment);
  window.addEventListener("hashchange", scheduleGeneratedDocsHashAlignment);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGeneratedDocsHashAligner, {
    once: true,
  });
} else {
  initGeneratedDocsHashAligner();
}
