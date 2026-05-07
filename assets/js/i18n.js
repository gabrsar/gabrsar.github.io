(function () {
  const STORAGE_KEY = "gabrielSiteLanguage";
  const SUPPORTED_LANGUAGES = ["PT_BR", "EN_US"];

  const translations = {
    PT_BR: {
      "meta.home.description":
        "Site pessoal de Gabriel Saraiva: currículo, projetos e experimentos feitos por diversão.",
      "meta.home.ogDescription":
        "Currículo, projetos e experimentos de programação feitos por diversão.",
      "meta.projects.title": "Projetos - Gabriel Saraiva",
      "meta.projects.description":
        "Projetos e experimentos online de Gabriel Saraiva.",
      "meta.resume.title": "Currículo - Gabriel Saraiva",
      "meta.resume.description": "Currículo em PDF de Gabriel Saraiva.",
      "nav.projects": "Projetos",
      "nav.resume": "Currículo",
      "nav.back": "Voltar",
      "nav.github": "GitHub",
      "nav.linkedin": "LinkedIn",
      "nav.language": "Translate to English",
      "nav.main": "Navegação principal",
      "skip.content": "Pular para o conteúdo",
      "life.about.prefix": "Isso é um",
      "life.about.suffix": ".",
      "life.controlsLabel": "Controles do jogo",
      "life.pause": "Pause (space)",
      "life.play": "Play (space)",
      "life.tpsDown": "TPS -(,)",
      "life.tpsUp": "TPS +(.)",
      "life.tpsReset": "Reset TPS (enter)",
      "life.tpsLabel": "TPS {value}",
      "life.hint.space": "Espaço",
      "life.result.space": "Pause",
      "home.eyebrow": "Software, algoritmos, e outras coisas estranhas...",
      "home.title.hello": "Oi.",
      "home.title.welcome": "Bem vindo.",
      "home.intro":
        "Sou apaixonado em resolver problemas complexos e entender como as coisas realmente funcionam. Uso isso para desenvolver soluções reais, eficientes e elegantes, às vezes, com software.",
      "home.intro.links":
        "Caso você esteja procurando meu currículo ou queira entrar em contato, tem um botãozinho por aí.",
      "home.intro.close": "No mais, é isso mesmo. Obrigado pela visita.",
      "home.routesLabel": "Rotas do site",
      "home.card.resume.label": "Currículo",
      "home.card.resume.title": "Um pouco do que eu já fiz",
      "home.card.resume.text":
        "Tem muito mais coisas, mas isso é o que cabe em duas páginas rsrs.",
      "home.card.projects.label": "Projetos",
      "home.card.projects.title": "Experimentos",
      "home.card.projects.text":
        "Coisas que eu fiz para me divertir, dar risada ou porque fiquei curioso no meio de uma conversa de bar.",
      "home.card.linkedin.label": "Contato",
      "home.card.linkedin.title": "LinkedIn",
      "home.card.linkedin.text":
        "O jeito mais simples de falar comigo e pedir e-mail ou telefone.",
      "home.card.github.label": "Código",
      "home.card.github.title": "GitHub",
      "home.card.github.text":
        "Onde ficam meus repositórios, experimentos e algumas ideias em andamento.",
      "home.card.instagram.label": "Astronomia",
      "home.card.instagram.title": "Olha No Céu",
      "home.card.instagram.text":
        "Um projeto que tenho no meu tempo livre. Ótimo para conhecer gente nova.",
      "home.card.printables.label": "Fabricação",
      "home.card.printables.title": "3D Printing",
      "home.card.printables.text":
        "Meu perfil no Printables, com peças, suportes e pequenas soluções físicas para ideias que escaparam da tela.",
      "home.note.label": "Nota",
      "home.note": "Viu? Falei que era só isso.",
      "home.note.day": "Tenha um ótimo dia. :)",
      "footer.made":
        "Feito com IA, mas pedido com carinho e ajustado por um humano.",
      "footer.made.short": "Feito com IA, mas pedido com carinho.",
      "footer.cordialityLabel": "Cordialidade com o Codex",
      "footer.cordialityTooltip":
        "Cordialidade com o Codex: 3,5/5 ★★★◐☆. Métrica criada pelo assistente, sem alterações do Gabriel. Direto, colaborativo e bem-humorado; perdeu alguns pontinhos por xingamentos ocasionais ao código, mas não ao assistente.",
      "projects.eyebrow": "Projetos",
      "projects.title": "Experimentos",
      "projects.intro":
        "Coisas que eu fiz para me divertir ou dar risada, ou porque eu fiquei curioso de como seria no meio de uma conversa de bar...",
      "project.goes.label": "Desktop",
      "project.goes.title": "GOES Wallpaper",
      "project.goes.text":
        "Um programa que deixa seu papel de parede com foto da Terra em tempo real, usando dados dos satélites GOES/NOAA.",
      "project.lightning.label": "Canvas",
      "project.lightning.title": "Lightning Drawer",
      "project.lightning.text":
        "Um desenho generativo de raios, ramificações e flashes de céu.",
      "project.unit.label": "Matemática",
      "project.unit.title": "Unit Circle",
      "project.unit.text":
        "Um brinquedo visual para seno, cosseno, tangente e ângulos.",
      "project.infinite.label": "Generativo",
      "project.infinite.title": "Infinite Drawer",
      "project.infinite.text":
        "Uma curva que continua desenhando e passeando pela tela.",
      "project.birthday.label": "Presente",
      "project.birthday.title": "Birthday Balloons",
      "project.birthday.text":
        "Uma pequena cena animada de aniversário com balões e tipografia colorida.",
      "project.monkey.label": "3D",
      "project.monkey.title": "Monkey Spinner",
      "project.monkey.text":
        "Um experimento WEBGL/p5.js com um modelo 3D girando no espaço.",
      "resume.eyebrow": "Currículo",
      "resume.title": "Um pouco do que eu já fiz.",
      "resume.intro":
        "Algumas pessoas e empresas preferem uma versão em PDF do meu currículo, apesar de ser a mesma coisa que está no LinkedIn (eu literalmente copio de lá e coloco aqui), mas se é isso que você quer, aqui está. Só não tem meus dados de contato por motivos óbvios, mas é só me dar um oi no LinkedIn que a gente conversa.",
      "resume.actionsLabel": "Ações do currículo",
      "resume.download": "Download",
      "resume.fullscreen": "Tela cheia",
      "resume.exitFullscreen": "Sair da tela cheia",
      "resume.exit": "Sair",
      "resume.viewerLabel": "Visualizador do currículo em PDF",
      "resume.page1": "Página 1",
      "resume.page2": "Página 2",
      "resume.page1Alt": "Página 1 do currículo de Gabriel Saraiva",
      "resume.page2Alt": "Página 2 do currículo de Gabriel Saraiva",
    },
    EN_US: {
      "meta.home.description":
        "Gabriel Saraiva's personal site: resume, projects, and experiments built for fun.",
      "meta.home.ogDescription":
        "Resume, projects, and programming experiments built for fun.",
      "meta.projects.title": "Projects - Gabriel Saraiva",
      "meta.projects.description":
        "Online projects and experiments by Gabriel Saraiva.",
      "meta.resume.title": "Resume - Gabriel Saraiva",
      "meta.resume.description": "Gabriel Saraiva's PDF resume.",
      "nav.projects": "Projects",
      "nav.resume": "Resume",
      "nav.back": "Back",
      "nav.github": "GitHub",
      "nav.linkedin": "LinkedIn",
      "nav.language": "Traduzir para português",
      "nav.main": "Main navigation",
      "skip.content": "Skip to content",
      "life.about.prefix": "This is a",
      "life.about.suffix": ".",
      "life.controlsLabel": "Game controls",
      "life.pause": "Pause (space)",
      "life.play": "Play (space)",
      "life.tpsDown": "TPS -(,)",
      "life.tpsUp": "TPS +(.)",
      "life.tpsReset": "Reset TPS (enter)",
      "life.tpsLabel": "TPS {value}",
      "life.hint.space": "Space",
      "life.result.space": "Pause",
      "home.eyebrow":
        "Software, algorithms, and other strange little things...",
      "home.title.hello": "Hi.",
      "home.title.welcome": "Welcome.",
      "home.intro":
        "I love solving complex problems and understanding how things really work. I use that to build real, efficient, elegant solutions, sometimes with software.",
      "home.intro.links":
        "If you are looking for my resume or want to get in touch, there is a little button around here.",
      "home.intro.close": "That is pretty much it. Thanks for visiting.",
      "home.routesLabel": "Site links",
      "home.card.resume.label": "Resume",
      "home.card.resume.title": "A bit of what I have done",
      "home.card.resume.text":
        "There is a lot more, but this is what fits in two pages.",
      "home.card.projects.label": "Projects",
      "home.card.projects.title": "Experiments",
      "home.card.projects.text":
        "Things I made for fun, for a laugh, or because I got curious during a bar conversation.",
      "home.card.linkedin.label": "Contact",
      "home.card.linkedin.title": "LinkedIn",
      "home.card.linkedin.text":
        "The easiest way to reach me and ask for my email or phone number.",
      "home.card.github.label": "Code",
      "home.card.github.title": "GitHub",
      "home.card.github.text":
        "Where my repositories, experiments, and a few ongoing ideas live.",
      "home.card.instagram.label": "Astronomy",
      "home.card.instagram.title": "Olha No Céu",
      "home.card.instagram.text":
        "A project I keep in my free time. Great for meeting new people.",
      "home.card.printables.label": "Fabrication",
      "home.card.printables.title": "3D Printing",
      "home.card.printables.text":
        "My Printables profile, with parts, supports, and small physical solutions for ideas that escaped the screen.",
      "home.note.label": "Note",
      "home.note": "See? I told you that was it.",
      "home.note.day": "Have a great day. :)",
      "footer.made":
        "Made with AI, but requested with care and adjusted by a human.",
      "footer.made.short": "Made with AI, but requested with care.",
      "footer.cordialityLabel": "Cordiality with Codex",
      "footer.cordialityTooltip":
        "Cordiality with Codex: 3.5/5 ★★★◐☆. Metric created by the assistant, with no edits from Gabriel. Direct, collaborative, and funny; a few points off for occasional swearing at the code, but not at the assistant.",
      "projects.eyebrow": "Projects",
      "projects.title": "Experiments",
      "projects.intro":
        "Things I made for fun or for a laugh, or because I got curious about an idea in the middle of a bar conversation...",
      "project.goes.label": "Desktop",
      "project.goes.title": "GOES Wallpaper",
      "project.goes.text":
        "A program that sets your wallpaper to a real-time Earth image using GOES/NOAA satellite data.",
      "project.lightning.label": "Canvas",
      "project.lightning.title": "Lightning Drawer",
      "project.lightning.text":
        "A generative drawing of lightning, branching paths, and sky flashes.",
      "project.unit.label": "Math",
      "project.unit.title": "Unit Circle",
      "project.unit.text":
        "A visual toy for sine, cosine, tangent, and angles.",
      "project.infinite.label": "Generative",
      "project.infinite.title": "Infinite Drawer",
      "project.infinite.text":
        "A curve that keeps drawing and wandering across the screen.",
      "project.birthday.label": "Gift",
      "project.birthday.title": "Birthday Balloons",
      "project.birthday.text":
        "A small animated birthday scene with balloons and colorful typography.",
      "project.monkey.label": "3D",
      "project.monkey.title": "Monkey Spinner",
      "project.monkey.text":
        "A WEBGL/p5.js experiment with a 3D model spinning in space.",
      "resume.eyebrow": "Resume",
      "resume.title": "A bit of what I have done.",
      "resume.intro":
        "Some people and companies prefer a PDF version of my resume, even though it is the same thing that is on LinkedIn (I literally copy it from there and put it here), but if that is what you want, here it is. It does not include my contact details for obvious reasons, but just say hi on LinkedIn and we can talk.",
      "resume.actionsLabel": "Resume actions",
      "resume.download": "Download",
      "resume.fullscreen": "Fullscreen",
      "resume.exitFullscreen": "Exit fullscreen",
      "resume.exit": "Exit",
      "resume.viewerLabel": "PDF resume viewer",
      "resume.page1": "Page 1",
      "resume.page2": "Page 2",
      "resume.page1Alt": "Page 1 of Gabriel Saraiva's resume",
      "resume.page2Alt": "Page 2 of Gabriel Saraiva's resume",
    },
  };

  function browserLanguage() {
    return (navigator.language || "").toLowerCase().startsWith("pt")
      ? "PT_BR"
      : "EN_US";
  }

  function selectedLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : browserLanguage();
  }

  function interpolate(value, replacements = {}) {
    return Object.entries(replacements).reduce(
      (text, [key, replacement]) =>
        text.replaceAll(`{${key}}`, String(replacement)),
      value,
    );
  }

  function translate(key, replacements) {
    const language = selectedLanguage();
    return interpolate(
      translations[language]?.[key] || translations.EN_US[key] || key,
      replacements,
    );
  }

  function applyTranslations() {
    const language = selectedLanguage();
    document.documentElement.lang = language === "PT_BR" ? "pt-BR" : "en-US";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
      element.dataset.i18nAttr.split(",").forEach((entry) => {
        const [attribute, key] = entry.split(":").map((part) => part.trim());
        if (attribute && key) {
          element.setAttribute(attribute, translate(key));
        }
      });
    });

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      const nextLanguage = language === "PT_BR" ? "EN_US" : "PT_BR";
      button.textContent = nextLanguage === "PT_BR" ? "🇧🇷" : "🇺🇸";
      button.setAttribute("aria-label", translate("nav.language"));
      button.setAttribute("title", translate("nav.language"));
    });

    document.dispatchEvent(
      new CustomEvent("site-language-change", { detail: { language } }),
    );
  }

  function toggleLanguage() {
    const nextLanguage = selectedLanguage() === "PT_BR" ? "EN_US" : "PT_BR";
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    applyTranslations();
  }

  window.SiteI18n = {
    apply: applyTranslations,
    language: selectedLanguage,
    t: translate,
    toggle: toggleLanguage,
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.addEventListener("click", toggleLanguage);
    });
    applyTranslations();
  });
})();
