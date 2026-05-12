import {
  GlobalWorkerOptions,
  TextLayer,
  getDocument,
} from "../vendor/pdfjs/pdf.mjs";
import {
  AnnotationLayerBuilder,
  EventBus,
  LinkTarget,
  SimpleLinkService,
} from "../vendor/pdfjs/pdf_viewer.mjs";

const PDF_URL = "./Gabriel-Saraiva-Staff-Software-Engineer-Resume.pdf";
const MAX_PAGE_WIDTH = 816;

GlobalWorkerOptions.workerSrc = "../assets/vendor/pdfjs/pdf.worker.mjs";

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

async function renderPage({ pdf, pageNumber, container, linkService }) {
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const width = pageWidth(container, baseViewport);
  const viewport = page.getViewport({ scale: width / baseViewport.width });
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);

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
    imageResourcesPath: "../assets/vendor/pdfjs/images/",
    onAppend: (layer) => pageElement.append(layer),
  });
  await annotationLayer.render({ viewport });
}

async function renderResumePdf() {
  const container = document.querySelector("#pages");
  if (!container) {
    return;
  }

  const fallback = container.innerHTML;
  try {
    const pdf = await getDocument({
      url: PDF_URL,
      standardFontDataUrl: "../assets/vendor/pdfjs/standard_fonts/",
    }).promise;

    const eventBus = new EventBus();
    const linkService = new SimpleLinkService({
      eventBus,
      externalLinkTarget: LinkTarget.BLANK,
      externalLinkRel: "noopener noreferrer",
    });
    linkService.setDocument(pdf, PDF_URL);

    container.replaceChildren();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      await renderPage({ pdf, pageNumber, container, linkService });
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
