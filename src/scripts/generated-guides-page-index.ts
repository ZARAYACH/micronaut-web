const pageIndexSelector = "[data-guide-page-index]";
const pageIndexNavSelector = "[data-guide-page-index-nav]";
const pageIndexTopSelector = "[data-guide-page-index-top]";
const pageIndexLinkSelector = "[data-guide-page-index-link]";
const pageIndexInnerSelector = "[data-guide-page-index-inner]";
const guideSectionLinkSelector = "[data-guide-section-link]";

const readHashSectionId = () => {
  if (!window.location.hash) {
    return undefined;
  }
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
};

const scrollOffset = () => {
  const scrollPaddingTop = Number.parseFloat(
    window.getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  const fixedOffset = (Number.isFinite(scrollPaddingTop) ? scrollPaddingTop : 80) + 16;
  return Math.max(fixedOffset, window.innerHeight * 0.25);
};

const scrollActiveLinkIntoView = (link: HTMLElement | undefined) => {
  if (!link) {
    return;
  }
  const container = link?.closest<HTMLElement>(pageIndexInnerSelector);
  if (!container || container.scrollHeight <= container.clientHeight) {
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const margin = 20;
  if (linkRect.top < containerRect.top + margin) {
    container.scrollTop -= containerRect.top + margin - linkRect.top;
  } else if (linkRect.bottom > containerRect.bottom - margin) {
    container.scrollTop += linkRect.bottom - containerRect.bottom + margin;
  }
};

const buildLinksBySectionId = (links: HTMLElement[]) => {
  const linksById = new Map<string, HTMLElement>();
  for (const link of links) {
    const sectionId = link.dataset.sectionId;
    if (sectionId) {
      linksById.set(sectionId, link);
    }
  }
  return linksById;
};

const buildGuideSectionLinksById = () => {
  const guideSectionLinks = Array.from(
    document.querySelectorAll<HTMLElement>(guideSectionLinkSelector),
  );
  const guideSectionLinksById = new Map<string, HTMLElement[]>();
  for (const link of guideSectionLinks) {
    const sectionId = link.dataset.sectionId;
    if (!sectionId) {
      continue;
    }
    const sectionLinks = guideSectionLinksById.get(sectionId) || [];
    sectionLinks.push(link);
    guideSectionLinksById.set(sectionId, sectionLinks);
  }
  return guideSectionLinksById;
};

const initGeneratedGuidesPageIndex = () => {
  const pageIndex = document.querySelector<HTMLElement>(pageIndexSelector);
  const pageIndexNav = pageIndex?.querySelector<HTMLElement>(pageIndexNavSelector);
  const pageIndexTop = pageIndex?.querySelector<HTMLAnchorElement>(pageIndexTopSelector);
  if (!pageIndex || !pageIndexNav) {
    return;
  }

  const links = Array.from(
    pageIndexNav.querySelectorAll<HTMLElement>(pageIndexLinkSelector),
  );
  const linksById = buildLinksBySectionId(links);
  const guideSectionLinksById = buildGuideSectionLinksById();
  const headings = links
    .map((link) => document.getElementById(link.dataset.sectionId || ""))
    .filter((heading): heading is HTMLElement => Boolean(heading));
  let activeRootId = "";
  let activeLink: HTMLElement | undefined;
  let activeGuideSectionId = "";
  let activeGuideSectionLinks: HTMLElement[] = [];
  let updateFrame = 0;

  const activeHeadingFromScroll = () => {
    if (!headings.length) {
      return undefined;
    }
    const offset = scrollOffset();
    let activeHeading = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= offset) {
        activeHeading = heading;
      } else {
        break;
      }
    }
    return activeHeading;
  };

  const setActiveSection = (sectionId: string) => {
    const nextLink = linksById.get(sectionId) || links[0];
    const nextRootId = nextLink?.dataset.rootId || "";
    if (nextRootId && nextRootId !== activeRootId) {
      activeRootId = nextRootId;
      const rootLink = linksById.get(activeRootId);
      if (pageIndexTop) {
        const rootLabel = rootLink?.textContent?.trim() || "section";
        pageIndexTop.href = `#${activeRootId}`;
        pageIndexTop.setAttribute("aria-label", `Back to ${rootLabel}`);
        pageIndexTop.setAttribute("title", `Back to ${rootLabel}`);
      }
      for (const link of links) {
        link.hidden = link.dataset.rootId !== activeRootId;
      }
    }

    if (activeLink && activeLink !== nextLink) {
      activeLink.classList.remove("active");
      activeLink.removeAttribute("aria-current");
    }
    if (nextLink) {
      nextLink.classList.add("active");
      nextLink.setAttribute("aria-current", "location");
      activeLink = nextLink;
      scrollActiveLinkIntoView(nextLink);
    }

    if (nextRootId && nextRootId !== activeGuideSectionId) {
      activeGuideSectionId = nextRootId;
      for (const link of activeGuideSectionLinks) {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
      activeGuideSectionLinks = guideSectionLinksById.get(nextRootId) || [];
      for (const link of activeGuideSectionLinks) {
        link.classList.add("active");
        link.setAttribute("aria-current", "location");
      }
    }
  };

  const setActiveSectionFromHash = () => {
    const sectionId = readHashSectionId();
    if (!sectionId || !linksById.has(sectionId)) {
      return false;
    }
    setActiveSection(sectionId);
    return true;
  };

  const updateActiveSection = () => {
    updateFrame = 0;
    const activeHeading = activeHeadingFromScroll();
    if (activeHeading) {
      setActiveSection(activeHeading.id);
    }
  };

  const queueActiveSectionUpdate = () => {
    if (updateFrame) {
      return;
    }
    updateFrame = window.requestAnimationFrame(updateActiveSection);
  };

  const queueHashSectionUpdate = () => {
    window.setTimeout(() => {
      if (!setActiveSectionFromHash()) {
        queueActiveSectionUpdate();
      }
    }, 0);
    window.setTimeout(() => {
      if (!setActiveSectionFromHash()) {
        queueActiveSectionUpdate();
      }
    }, 150);
  };

  window.addEventListener("scroll", queueActiveSectionUpdate, {
    passive: true,
  });
  window.addEventListener("resize", queueActiveSectionUpdate);
  window.addEventListener("hashchange", queueHashSectionUpdate);
  if (!setActiveSectionFromHash()) {
    updateActiveSection();
  }
  queueHashSectionUpdate();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGeneratedGuidesPageIndex, {
    once: true,
  });
} else {
  initGeneratedGuidesPageIndex();
}
