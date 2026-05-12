import * as pdfjs from "../vendor/pdfjs/pdf.mjs";

const { GlobalWorkerOptions, TextLayer, getDocument } = pdfjs;

const PDF_URL = new URL(
  "../../resume/Gabriel-Saraiva-Staff-Software-Engineer-Resume.pdf",
  import.meta.url,
).href;
const PDF_IMAGES_URL = new URL("../vendor/pdfjs/images/", import.meta.url).href;
const PDF_STANDARD_FONTS_URL = new URL(
  "../vendor/pdfjs/standard_fonts/",
  import.meta.url,
).href;
const MAX_PAGE_WIDTH = 816;
const ZOOM_SCALE = 1.72;

GlobalWorkerOptions.workerSrc = new URL(
  "../vendor/pdfjs/pdf.worker.mjs",
  import.meta.url,
).href;

let viewerToolsPromise;

function loadViewerTools() {
  // The PDF.js viewer helpers expect the core bundle on this global.
  globalThis.pdfjsLib ||= pdfjs;
  viewerToolsPromise ||= import("../vendor/pdfjs/pdf_viewer.mjs");
  return viewerToolsPromise;
}

function installPageZoom(page) {
  function updateZoomOrigin(event) {
    const rect = page.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    page.style.setProperty("--zoom-x", `${Math.max(0, Math.min(100, x))}%`);
    page.style.setProperty("--zoom-y", `${Math.max(0, Math.min(100, y))}%`);
  }

  page.addEventListener("pointermove", updateZoomOrigin);
  page.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      return;
    }
    updateZoomOrigin(event);
    page.classList.toggle("is-zoomed");
  });
  page.addEventListener("pointerleave", () => {
    page.classList.remove("is-zoomed");
  });
}

function pageWidth(container, viewport) {
  const available = Math.max(280, container.clientWidth || MAX_PAGE_WIDTH);
  return Math.min(available, MAX_PAGE_WIDTH, viewport.width);
}

async function renderPage({
  pdf,
  pageNumber,
  container,
  linkService,
  AnnotationLayerBuilder,
}) {
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const width = pageWidth(container, baseViewport);
  const viewport = page.getViewport({ scale: width / baseViewport.width });
  const outputScale = Math.min((window.devicePixelRatio || 1) * ZOOM_SCALE, 4);

  const pageElement = document.createElement("article");
  pageElement.className = "pdf-page pdf-js-page";
  pageElement.setAttribute("aria-label", `Page ${pageNumber}`);
  pageElement.style.width = `${viewport.width}px`;
  pageElement.style.height = `${viewport.height}px`;

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  pageElement.append(canvas);

  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  pageElement.append(textLayer);

  container.append(pageElement);
  installPageZoom(pageElement);

  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
    transform:
      outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
  }).promise;

  const textContent = await page.getTextContent();
  await new TextLayer({
    textContentSource: textContent,
    container: textLayer,
    viewport,
  }).render();

  const annotationLayer = new AnnotationLayerBuilder({
    pdfPage: page,
    linkService,
    imageResourcesPath: PDF_IMAGES_URL,
    onAppend: (layer) => pageElement.append(layer),
  });
  await annotationLayer.render({ viewport });
}

async function renderResumePdf() {
  const container = document.querySelector("#pages");
  if (!container) {
    return;
  }

  if (window.location.protocol === "file:") {
    console.warn(
      "PDF.js needs an HTTP origin; keeping rendered image fallback for file:// preview.",
    );
    return;
  }

  const fallback = container.innerHTML;
  try {
    const pdf = await getDocument({
      url: PDF_URL,
      standardFontDataUrl: PDF_STANDARD_FONTS_URL,
    }).promise;

    const { AnnotationLayerBuilder, EventBus, LinkTarget, SimpleLinkService } =
      await loadViewerTools();
    const eventBus = new EventBus();
    const linkService = new SimpleLinkService({
      eventBus,
      externalLinkTarget: LinkTarget.BLANK,
      externalLinkRel: "noopener noreferrer",
    });
    linkService.setDocument(pdf, PDF_URL);

    container.replaceChildren();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      await renderPage({
        pdf,
        pageNumber,
        container,
        linkService,
        AnnotationLayerBuilder,
      });
    }
  } catch (error) {
    console.warn(
      "PDF.js viewer failed; falling back to rendered images.",
      error,
    );
    container.innerHTML = fallback;
    container.querySelectorAll(".pdf-page").forEach(installPageZoom);
  }
}

renderResumePdf();
