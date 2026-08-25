(() => {
  "use strict";

  const PAGE_SIZE = 12;
  const MAX_SEED = 281474976710655n;
  const state = {
    locale: "en_US",
    seed: "",
    likes: 3.5,
    reviews: 2.5,
    mode: "table",
    tablePage: 1,
    galleryNextPage: 1,
    galleryLoading: false,
    generation: 0,
    tableController: null,
    locales: []
  };

  const ui = {};
  let inputTimer = 0;
  let galleryObserver = null;

  document.addEventListener("DOMContentLoaded", initialise);

  async function initialise() {
    collectElements();
    bindEvents();
    createGalleryObserver();
    setBusy(true, "Preparing the programme");

    try {
      const [locales, seedResult] = await Promise.all([
        getJson("/api/locales"),
        getJson("/api/seed")
      ]);
      state.locales = locales;
      state.seed = seedResult.seed;
      populateLocales(locales);
      ui.seedInput.value = state.seed;
      ui.editionSeed.textContent = `Seed ${state.seed}`;
      await loadTablePage(1);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function collectElements() {
    [
      "editionSeed", "localeInput", "seedInput", "randomSeedButton", "likesInput",
      "reviewsInput", "tableViewButton", "galleryViewButton", "cataloguePage",
      "statusText", "errorPanel", "errorText", "retryButton", "tableView",
      "movieTableBody", "previousPageButton", "pageIndicator", "nextPageButton",
      "galleryView", "galleryGrid", "gallerySentinel"
    ].forEach(id => { ui[id] = document.getElementById(id); });
    ui.catalogue = document.querySelector(".catalogue");
  }

  function bindEvents() {
    ui.localeInput.addEventListener("change", () => {
      state.locale = ui.localeInput.value;
      resetForParameters();
    });

    ui.seedInput.addEventListener("input", scheduleParameterUpdate);
    ui.likesInput.addEventListener("input", scheduleParameterUpdate);
    ui.reviewsInput.addEventListener("input", scheduleParameterUpdate);

    ui.randomSeedButton.addEventListener("click", async () => {
      ui.randomSeedButton.disabled = true;
      try {
        const result = await getJson("/api/seed");
        state.seed = result.seed;
        ui.seedInput.value = result.seed;
        resetForParameters();
      } catch (error) {
        showError(error);
      } finally {
        ui.randomSeedButton.disabled = false;
      }
    });

    ui.tableViewButton.addEventListener("click", () => switchView("table"));
    ui.galleryViewButton.addEventListener("click", () => switchView("gallery"));
    ui.previousPageButton.addEventListener("click", () => loadTablePage(state.tablePage - 1));
    ui.nextPageButton.addEventListener("click", () => loadTablePage(state.tablePage + 1));
    ui.retryButton.addEventListener("click", retryCurrentView);
  }

  function scheduleParameterUpdate() {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => {
      const seed = readSeed(ui.seedInput.value);
      const likes = readAverage(ui.likesInput.value);
      const reviews = readAverage(ui.reviewsInput.value);
      if (seed === null || likes === null || reviews === null) {
        ui.statusText.textContent = "Enter values from 0 to 10 and a valid seed";
        return;
      }

      state.seed = seed;
      state.likes = likes;
      state.reviews = reviews;
      resetForParameters();
    }, 260);
  }

  function readSeed(value) {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    try {
      const parsed = BigInt(trimmed);
      return parsed >= 0n && parsed <= MAX_SEED ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  function readAverage(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10
      ? Math.round(parsed * 10) / 10
      : null;
  }

  function populateLocales(locales) {
    ui.localeInput.replaceChildren();
    locales.forEach(locale => {
      const option = document.createElement("option");
      option.value = locale.id;
      option.textContent = locale.displayName;
      ui.localeInput.append(option);
    });
    const preferred = locales.find(locale => locale.id === state.locale) ?? locales[0];
    state.locale = preferred.id;
    ui.localeInput.value = preferred.id;
  }

  function resetForParameters() {
    state.generation += 1;
    state.tableController?.abort();
    state.tablePage = 1;
    state.galleryNextPage = 1;
    state.galleryLoading = false;
    ui.movieTableBody.replaceChildren();
    ui.galleryGrid.replaceChildren();
    ui.errorPanel.hidden = true;
    ui.editionSeed.textContent = `Seed ${state.seed}`;

    if (state.mode === "table") {
      loadTablePage(1);
    } else {
      window.scrollTo({ top: ui.catalogue.offsetTop, behavior: "auto" });
      loadNextGalleryPage();
    }
  }

  function switchView(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.generation += 1;
    state.tableController?.abort();
    state.tablePage = 1;
    state.galleryNextPage = 1;
    state.galleryLoading = false;
    ui.errorPanel.hidden = true;

    const tableMode = mode === "table";
    ui.tableView.hidden = !tableMode;
    ui.galleryView.hidden = tableMode;
    ui.tableViewButton.classList.toggle("active", tableMode);
    ui.galleryViewButton.classList.toggle("active", !tableMode);
    ui.tableViewButton.setAttribute("aria-pressed", String(tableMode));
    ui.galleryViewButton.setAttribute("aria-pressed", String(!tableMode));

    if (tableMode) {
      ui.galleryGrid.replaceChildren();
      loadTablePage(1);
    } else {
      ui.movieTableBody.replaceChildren();
      ui.galleryGrid.replaceChildren();
      loadNextGalleryPage();
    }
  }

  async function loadTablePage(page) {
    if (page < 1 || state.mode !== "table") return;
    state.tableController?.abort();
    const controller = new AbortController();
    state.tableController = controller;
    const generation = state.generation;
    setBusy(true, `Loading page ${page}`);
    ui.previousPageButton.disabled = true;
    ui.nextPageButton.disabled = true;

    try {
      const batch = await fetchBatch(page, controller.signal);
      if (generation !== state.generation || state.mode !== "table") return;
      state.tablePage = page;
      applyBatchDirection(batch);
      renderTable(batch.items);
      updatePageLabels(page);
      ui.previousPageButton.disabled = page === 1;
      ui.nextPageButton.disabled = false;
      ui.errorPanel.hidden = true;
      ui.statusText.textContent = `${batch.items.length} films ready`;
    } catch (error) {
      if (error.name !== "AbortError") showError(error);
    } finally {
      if (generation === state.generation) setBusy(false);
    }
  }

  async function loadNextGalleryPage() {
    if (state.mode !== "gallery" || state.galleryLoading) return;
    const generation = state.generation;
    const page = state.galleryNextPage;
    state.galleryLoading = true;
    setBusy(true, `Curating gallery batch ${page}`);

    try {
      const batch = await fetchBatch(page);
      if (generation !== state.generation || state.mode !== "gallery") return;
      applyBatchDirection(batch);
      renderGalleryBatch(batch.items);
      state.galleryNextPage += 1;
      updatePageLabels(page);
      ui.errorPanel.hidden = true;
      ui.statusText.textContent = `${ui.galleryGrid.children.length} films in view`;
    } catch (error) {
      showError(error);
    } finally {
      if (generation === state.generation) {
        state.galleryLoading = false;
        setBusy(false);
      }
    }
  }

  function fetchBatch(page, signal) {
    const query = new URLSearchParams({
      locale: state.locale,
      seed: state.seed,
      likes: String(state.likes),
      reviews: String(state.reviews),
      page: String(page),
      pageSize: String(PAGE_SIZE)
    });
    return getJson(`/api/movies?${query}`, signal);
  }

  async function getJson(url, signal) {
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = await response.json();
        if (body.error) message = body.error;
      } catch { }
      throw new Error(message);
    }
    return response.json();
  }

  function applyBatchDirection(batch) {
    document.documentElement.lang = batch.locale.startsWith("ar") ? "ar" : "en";
    document.documentElement.dir = batch.direction;
  }

  function updatePageLabels(page) {
    ui.cataloguePage.textContent = state.mode === "table" ? `Page ${page}` : `Batch ${page}`;
    ui.pageIndicator.textContent = `Page ${page}`;
  }

  function renderTable(movies) {
    const fragment = document.createDocumentFragment();
    movies.forEach(movie => {
      const row = createTableRow(movie);
      const details = createDetailRow(movie, row);
      fragment.append(row, details);
    });
    ui.movieTableBody.replaceChildren(fragment);
  }

  function createTableRow(movie) {
    const row = element("tr", "movieRow");
    row.append(
      cell("movieNumber", String(movie.index).padStart(2, "0")),
      titleCell(movie),
      cell("", String(movie.year)),
      cell("", movie.genre),
      cell("movieActors", movie.actors.join(", "))
    );

    const actionCell = document.createElement("td");
    const button = element("button", "rowToggle", "+");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", `Open details for ${movie.title}`);
    actionCell.append(button);
    row.append(actionCell);
    return row;
  }

  function titleCell(movie) {
    const td = document.createElement("td");
    td.append(element("strong", "movieTitle", movie.title));
    return td;
  }

  function cell(className, text) {
    const td = element("td", className, text);
    return td;
  }

  function createDetailRow(movie, row) {
    const detailRow = element("tr", "detailRow");
    detailRow.hidden = true;
    const td = document.createElement("td");
    td.colSpan = 6;
    td.append(createMovieDetail(movie));
    detailRow.append(td);

    const button = row.querySelector(".rowToggle");
    button.addEventListener("click", () => {
      const open = detailRow.hidden;
      detailRow.hidden = !open;
      row.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", `${open ? "Close" : "Open"} details for ${movie.title}`);
    });
    return detailRow;
  }

  function createMovieDetail(movie) {
    const wrapper = element("div", "movieDetail");
    wrapper.append(createPoster(movie), createDetailCopy(movie));
    return wrapper;
  }

  function createPoster(movie) {
    const poster = element(
      "div",
      `posterStage layout${capitalise(movie.poster.layout)} motif${capitalise(movie.poster.motif)}`
    );
    applyPosterVariables(poster, movie.poster);
    const words = element("div", "posterWords");
    words.append(
      element("strong", "", movie.title),
      element("span", "", `${movie.year}  ${movie.genre}`)
    );
    const play = element("button", "posterPlay", "▶");
    play.type = "button";
    play.setAttribute("aria-label", `Play trailer for ${movie.title}`);
    play.addEventListener("click", () => window.LumenTrailer.open(movie));
    poster.append(words, play);
    return poster;
  }

  function applyPosterVariables(node, poster) {
    node.style.setProperty("--posterPrimary", poster.primary);
    node.style.setProperty("--posterSecondary", poster.secondary);
    node.style.setProperty("--posterAccent", poster.accent);
    node.style.setProperty("--focusX", `${Math.round(poster.focusX * 100)}%`);
    node.style.setProperty("--focusY", `${Math.round(poster.focusY * 100)}%`);
    node.style.setProperty("--grain", String(poster.grain));
  }

  function createDetailCopy(movie) {
    const copy = element("div", "detailCopy");
    copy.append(
      element("h3", "", movie.title),
      statline(movie),
      createReviews(movie.reviews)
    );
    return copy;
  }

  function statline(movie) {
    const line = element("p", "detailStatline");
    line.append(
      element("span", "", `${movie.likes} likes`),
      element("span", "", `${movie.reviews.length} reviews`),
      element("span", "", movie.actors.join(", "))
    );
    return line;
  }

  function createReviews(reviews) {
    if (!reviews.length) return element("p", "emptyReviews", "No audience reviews yet.");
    const list = element("ul", "reviewList");
    reviews.forEach(review => {
      const item = document.createElement("li");
      item.append(
        element("blockquote", "", `“${review.text}”`),
        element("cite", "", `${review.reviewer}  ${"★".repeat(review.rating)}`)
      );
      list.append(item);
    });
    return list;
  }

  function renderGalleryBatch(movies) {
    const fragment = document.createDocumentFragment();
    movies.forEach(movie => fragment.append(createGalleryCard(movie)));
    ui.galleryGrid.append(fragment);
  }

  function createGalleryCard(movie) {
    const article = element("article", "galleryCard");
    const poster = element(
      "button",
      `galleryPoster layout${capitalise(movie.poster.layout)} motif${capitalise(movie.poster.motif)}`
    );
    poster.type = "button";
    poster.setAttribute("aria-label", `Play trailer for ${movie.title}`);
    applyPosterVariables(poster, movie.poster);
    const words = element("span", "galleryPosterWords");
    words.append(
      element("span", "", `${movie.index}  ${movie.year}`),
      element("strong", "", movie.title)
    );
    poster.append(words);
    poster.addEventListener("click", () => window.LumenTrailer.open(movie));

    const caption = element("div", "galleryCaption");
    const summary = element("p", "", `${movie.genre}  ${movie.actors.join(", ")}`);
    const detailButton = element("button", "", "Details");
    detailButton.type = "button";
    detailButton.setAttribute("aria-expanded", "false");
    caption.append(summary, detailButton);

    const details = element("div", "galleryDetails");
    details.hidden = true;
    details.append(statline(movie), createReviews(movie.reviews));
    detailButton.addEventListener("click", () => {
      const open = details.hidden;
      details.hidden = !open;
      detailButton.textContent = open ? "Close" : "Details";
      detailButton.setAttribute("aria-expanded", String(open));
    });

    article.append(poster, caption, details);
    return article;
  }

  function createGalleryObserver() {
    galleryObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextGalleryPage();
    }, { rootMargin: "500px 0px" });
    galleryObserver.observe(ui.gallerySentinel);
  }

  function retryCurrentView() {
    ui.errorPanel.hidden = true;
    if (state.mode === "table") loadTablePage(state.tablePage);
    else loadNextGalleryPage();
  }

  function setBusy(busy, message) {
    ui.catalogue.setAttribute("aria-busy", String(busy));
    if (message) ui.statusText.textContent = message;
  }

  function showError(error) {
    setBusy(false);
    ui.errorText.textContent = error.message || "The programme could not be loaded.";
    ui.errorPanel.hidden = false;
    ui.statusText.textContent = "Programme interrupted";
  }

  function element(tagName, className = "", text = "") {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== "") node.textContent = text;
    return node;
  }

  function capitalise(value) {
    return value ? value[0].toUpperCase() + value.slice(1) : "";
  }
})();
