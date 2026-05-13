(function () {
  const EXTERNAL_LINKS = [
    {
      href: "https://github.com/gabrsar",
      i18n: "nav.github",
      label: "GitHub",
    },
    {
      href: "https://br.linkedin.com/in/gabrielsaraiva7",
      i18n: "nav.linkedin",
      label: "LinkedIn",
    },
  ];

  const PAGE_LINKS = {
    home: [
      { path: "projects/index.html", i18n: "nav.projects", label: "Projetos" },
      { path: "resume/index.html", i18n: "nav.resume", label: "Currículo" },
      ...EXTERNAL_LINKS,
    ],
    projects: [
      { path: "index.html", i18n: "nav.back", label: "Voltar" },
      { path: "resume/index.html", i18n: "nav.resume", label: "Currículo" },
      ...EXTERNAL_LINKS,
    ],
    resume: [
      { path: "index.html", i18n: "nav.back", label: "Voltar" },
      { path: "projects/index.html", i18n: "nav.projects", label: "Projetos" },
      ...EXTERNAL_LINKS,
    ],
    fabrication: [
      { path: "index.html", i18n: "nav.back", label: "Voltar" },
      { path: "projects/index.html", i18n: "nav.projects", label: "Projetos" },
      { path: "resume/index.html", i18n: "nav.resume", label: "Currículo" },
      ...EXTERNAL_LINKS,
    ],
  };

  function localPath(root, path) {
    return root === "." ? `./${path}` : `${root}/${path}`;
  }

  function linkFor(root, item) {
    const link = document.createElement("a");
    link.href = item.href || localPath(root, item.path);
    link.textContent = item.label;
    if (item.i18n) {
      link.dataset.i18n = item.i18n;
    }
    if (item.href) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }

  function renderHeader(target) {
    const root = target.dataset.siteRoot || ".";
    const page = target.dataset.sitePage || "home";
    const style = target.dataset.layoutStyle || "subpage";
    const nav = document.createElement("nav");
    nav.className = style === "home" ? "site-nav" : "topbar";
    nav.setAttribute("aria-label", "Navegação principal");
    nav.dataset.i18nAttr = "aria-label: nav.main";

    const inner =
      style === "home" ? document.createElement("div") : document.createDocumentFragment();
    if (style === "home") {
      inner.className = "nav-inner";
      nav.append(inner);
    }

    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = localPath(root, "index.html");
    brand.textContent = "Gabriel Saraiva";
    inner.append(brand);

    const links = document.createElement("div");
    links.className = "nav-links";
    (PAGE_LINKS[page] || PAGE_LINKS.home).forEach((item) => {
      links.append(linkFor(root, item));
    });

    const language = document.createElement("button");
    language.className = "language-toggle";
    language.type = "button";
    language.dataset.languageToggle = "";
    language.textContent = "🇺🇸";
    links.append(language);
    inner.append(links);
    if (style !== "home") {
      nav.append(inner);
    }

    target.replaceWith(nav);
  }

  function renderFooter(target) {
    const footer = document.createElement("footer");
    const inner = document.createElement("div");
    inner.className = "footer-inner";

    const brand = document.createElement("span");
    brand.textContent = "Gabriel Saraiva";

    const made = document.createElement("span");
    made.className = "cordiality-score";
    made.title =
      "Cordialidade com o Codex: 4,5/5 ★★★⯨☆. Métrica criada pelo assistente, sem alterações do Gabriel. Direto, colaborativo e bem-humorado; perdeu alguns pontinhos por xingamentos ocasionais ao código, mas não ao assistente.";
    made.dataset.i18nAttr = "title: footer.cordialityTooltip";
    made.dataset.i18n = "footer.made";
    made.textContent =
      "Feito com IA, mas pedido com carinho e ajustado por um humano.";

    inner.append(brand, made);
    footer.append(inner);
    target.replaceWith(footer);
  }

  document.querySelectorAll("[data-site-header]").forEach(renderHeader);
  document.querySelectorAll("[data-site-footer]").forEach(renderFooter);
})();
