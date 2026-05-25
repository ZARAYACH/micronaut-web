import * as parse5 from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

export type MainSiteFaqItem = {
  id: string;
  question: string;
  answerHtml: string;
};

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlParentNode = DefaultTreeAdapterMap["parentNode"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlTextNode = DefaultTreeAdapterMap["textNode"];

function hasChildNodes(node: HtmlNode): node is HtmlParentNode {
  return "childNodes" in node;
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return node.nodeName === "#text";
}

function attr(node: HtmlNode | undefined, name: string) {
  if (!node || !("attrs" in node)) {
    return undefined;
  }
  return node.attrs.find((item) => item.name === name)?.value;
}

function textContent(node: HtmlNode): string {
  if (isTextNode(node)) {
    return node.value;
  }
  return hasChildNodes(node) ? node.childNodes.map(textContent).join("") : "";
}

function isElement(node: HtmlNode, tagName: string): node is HtmlElement {
  return "tagName" in node && node.tagName === tagName;
}

function isQuestionHeading(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && /^h[2-4]$/.test(node.tagName);
}

function serializeOuterHtml(node: HtmlNode) {
  return parse5.serializeOuter(node);
}

function idFromQuestion(question: string, index: number) {
  const slug = question
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `faq-${index + 1}`;
}

function itemFromListItem(node: HtmlElement, index: number): MainSiteFaqItem | undefined {
  const children = node.childNodes;
  const heading = children.find(isQuestionHeading);
  if (!heading) {
    return undefined;
  }

  const question = textContent(heading).replace(/\s+/g, " ").trim();
  if (!question) {
    return undefined;
  }

  const headingLink = heading.childNodes.find((child) => isElement(child, "a"));
  const anchorId = attr(headingLink ?? heading, "href")?.replace(/^#/, "")
    || attr(heading, "id")
    || idFromQuestion(question, index);
  const answerHtml = children
    .filter((child) => child !== heading)
    .map(serializeOuterHtml)
    .join("")
    .trim();

  return {
    id: anchorId,
    question,
    answerHtml
  };
}

export function extractFaqItemsFromHtml(html: string): MainSiteFaqItem[] {
  const fragment = parse5.parseFragment(html);
  const lists = fragment.childNodes.filter((node) => isElement(node, "ul"));
  for (const list of lists) {
    const items = list.childNodes
      .filter((node) => isElement(node, "li"))
      .map(itemFromListItem)
      .filter((item): item is MainSiteFaqItem => Boolean(item));
    if (items.length > 0) {
      return items;
    }
  }
  return [];
}
