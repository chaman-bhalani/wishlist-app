import diamondRound from "./diamond-round.svg";
document.addEventListener("DOMContentLoaded", function () {
  const addToCartButton = document.querySelector('button[name="add"]');
  const acceleratedCheckoutButton = document.querySelector(
    ".shopify-payment-button__button",
  );
  const productFormEl = document.querySelector('form[action^="/cart/add"]');
  const variantIdInputEl = productFormEl?.querySelector('input[name="id"]');
  const diamondContentSections = document.querySelectorAll(".diamond-content");
  const diamondTableWrapperEl = document.getElementById(
    "diamond-table-wrapper",
  );
  const diamondSummaryBoxEl = document.getElementById("diamond-summary-box");
  const diamondInfoTextEl = document.querySelector(".diamond-info-text");
  const diamondPriceTextEl = document.querySelector(".diamond-price");
  const changeDiamondButton = document.getElementById("change-diamond-btn");
  const paginationWrapperEl = document.getElementById("pagination-wrapper");
  const diamondTableLoaderEl = document.getElementById("diamond-table-loader");

  if (acceleratedCheckoutButton)
    acceleratedCheckoutButton.style.display = "none";

  const CLARITY_LEVELS = [
    "SI2",
    "SI1",
    "VS2",
    "VS1",
    "VVS2",
    "VVS1",
    "IF",
    "FL",
  ];
  const COLOR_GRADES = ["J", "I", "H", "G", "F", "E", "D"];
  const storeHandle = "dev-by-chaman";

  let filtersAreVisible = false;
  let selectedDiamondData = null;
  let currentPageNumber = 1;

  const baseProductPrice = (() => {
    const btnAttr = parseFloat(addToCartButton?.dataset.basePrice || "NaN");
    if (!isNaN(btnAttr)) return btnAttr;
    const liquidVal = parseFloat(
      '{{ product.price | money_without_currency | remove: "," }}' || "0",
    );
    return isNaN(liquidVal) ? 0 : liquidVal;
  })();

  function showDiamondTableLoading() {
    if (diamondTableLoaderEl) {
      diamondTableLoaderEl.classList.remove("hidden");
    }
    if (diamondTableWrapperEl) {
      diamondTableWrapperEl.classList.add("loading-active");
    }
  }

  function hideDiamondTableLoading() {
    if (diamondTableLoaderEl) {
      diamondTableLoaderEl.classList.add("hidden");
    }
    if (diamondTableWrapperEl) {
      diamondTableWrapperEl.classList.remove("loading-active");
    }
  }

  function hideElements(nodeList) {
    nodeList.forEach((el) => el.classList.add("hidden"));
  }

  function showElements(nodeList) {
    nodeList.forEach((el) => el.classList.remove("hidden"));
  }

  function getFilterValuesObj() {
    const clarityMinIndex =
      (+document.getElementById("clarityMin")?.value || 1) - 1;
    const clarityMaxIndex =
      (+document.getElementById("clarityMax")?.value || CLARITY_LEVELS.length) -
      1;
    const colorMinIndex =
      (+document.getElementById("colorMin")?.value || 1) - 1;
    const colorMaxIndex =
      (+document.getElementById("colorMax")?.value || COLOR_GRADES.length) - 1;
    const selectedClarity = CLARITY_LEVELS.slice(
      Math.min(clarityMinIndex, clarityMaxIndex),
      Math.max(clarityMinIndex, clarityMaxIndex) + 1,
    ).join(",");
    const selectedColor = COLOR_GRADES.slice(
      Math.min(colorMinIndex, colorMaxIndex),
      Math.max(colorMinIndex, colorMaxIndex) + 1,
    ).join(",");
    return {
      price: {
        min: document.getElementById("priceMin")?.value ?? "",
        max: document.getElementById("priceMax")?.value ?? "",
      },
      carat: {
        min: document.getElementById("caratMin")?.value ?? "",
        max: document.getElementById("caratMax")?.value ?? "",
      },
      clarity: selectedClarity,
      color: selectedColor,
    };
  }

  function updateAddToCartButtonLabel() {
    if (!addToCartButton) return;
    if (selectedDiamondData) {
      const diamondPrice = parseFloat(selectedDiamondData.price || 0);
      addToCartButton.textContent = `Add to cart – ₹${(baseProductPrice + diamondPrice).toLocaleString("en-IN")}`;
      addToCartButton.disabled = false;
    } else {
      addToCartButton.textContent = filtersAreVisible
        ? "Please select a diamond"
        : "Choose your diamond";
      addToCartButton.disabled = filtersAreVisible;
    }
  }

  function updateAddToCartButtonState() {
    if (!addToCartButton) return;
    const hasSelection = !!document.querySelector(".diamond-checkbox:checked");
    if (filtersAreVisible) addToCartButton.disabled = !hasSelection;
  }

  function getSelectedDiamondData() {
    const selectedRow = document
      .querySelector(".diamond-checkbox:checked")
      ?.closest("tr");
    if (!selectedRow) return null;
    const certNumber = selectedRow.getAttribute("data-cert");
    return (
      window.fetchedDiamonds?.find(
        (d) => String(d.certificate_number) === String(certNumber),
      ) || null
    );
  }

  function toggleDiamondSummaryDisplay() {
    if (selectedDiamondData) {
      const shape = selectedDiamondData.shape
        ? selectedDiamondData.shape.charAt(0).toUpperCase() +
          selectedDiamondData.shape.slice(1).toLowerCase()
        : "Diamond";
      const priceFormatted = `₹${(+selectedDiamondData.price || 0).toLocaleString("en-IN")}`;
      if (diamondInfoTextEl) {
        diamondInfoTextEl.innerHTML = `
          ${shape} ${selectedDiamondData.carat}ct, ${selectedDiamondData.color}, ${selectedDiamondData.clarity}<br>
          Certificate: <a href="https://www.igi.org/verify-your-report/?r=${selectedDiamondData.certificate_number}" target="_blank" rel="noopener noreferrer" class="cert-link">${selectedDiamondData.certificate_number}</a>
        `;
      }
      if (diamondPriceTextEl) diamondPriceTextEl.textContent = priceFormatted;
      const seeDiamondBtn = document.getElementById("see-diamond-btn");
      if (seeDiamondBtn) {
        const vid =
          selectedDiamondData.video_link ||
          selectedDiamondData.video_source ||
          "";
        seeDiamondBtn.setAttribute("data-video", vid);
      }
      hideElements(diamondContentSections);
      if (diamondTableWrapperEl) diamondTableWrapperEl.classList.add("hidden");
      if (diamondSummaryBoxEl) diamondSummaryBoxEl.classList.remove("hidden");
    } else {
      if (diamondTableWrapperEl)
        diamondTableWrapperEl.classList.remove("hidden");
      showElements(diamondContentSections);
      if (diamondSummaryBoxEl) diamondSummaryBoxEl.classList.add("hidden");
    }
  }

  function debounceFn(fn, delay) {
    let to;
    return (...args) => {
      clearTimeout(to);
      to = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function fetchDiamondDataFromApi(filters, page = 1, storeId) {
    const qs =
      `price_min=${encodeURIComponent(filters.price.min)}` +
      `&price_max=${encodeURIComponent(filters.price.max)}` +
      `&carat_min=${encodeURIComponent(filters.carat.min)}` +
      `&carat_max=${encodeURIComponent(filters.carat.max)}` +
      `&clarity=${encodeURIComponent(filters.clarity)}` +
      `&color=${encodeURIComponent(filters.color)}` +
      `&shape=Round` +
      `&page=${encodeURIComponent(page)}` +
      `&store_id=${encodeURIComponent(storeId)}`;
    const url = `https://possibilities-agenda-drops-remedies.trycloudflare.com/api/diamonds?${qs}`;
    console.log("fetchDiamondData url:", url);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch diamond data");
      const data = await res.json();
      return {
        diamonds: Array.isArray(data?.data?.diamonds) ? data.data.diamonds : [],
        pagination: data?.data?.pagination || { currentPage: 1, totalPages: 1 },
      };
    } catch (err) {
      console.error("API fetch error:", err);
      return { diamonds: [], pagination: { currentPage: 1, totalPages: 1 } };
    }
  }

  function renderDiamondTableHtml(diamonds) {
    if (!diamondTableWrapperEl) return;
    const tbody = diamondTableWrapperEl.querySelector("tbody");
    if (!tbody) {
      console.error("No <tbody> found inside #diamond-table-wrapper");
      return;
    }
    tbody.innerHTML = "";
    if (!diamonds.length) {
      const row = document.createElement("tr");
      row.className = "tbl-row";
      row.innerHTML = `<td colspan="6" style="text-align:center;">No diamonds found.</td>`;
      tbody.appendChild(row);
      document.dispatchEvent(new CustomEvent("diamond:rendered"));
      return;
    }
    diamonds.forEach((d) => {
      const row = document.createElement("tr");
      row.className = "tbl-row";
      if (d.certificate_number)
        row.setAttribute("data-cert", d.certificate_number);
      const origin = d.type
        ? d.type.charAt(0).toUpperCase() + d.type.slice(1).toLowerCase()
        : "N/A";
      row.innerHTML = `
        <td>
          <span class="col">
            <span class="icon-toggle-wrapper">
              <input type="checkbox" class="diamond-checkbox" />
              <img
                class="${diamondRound}"
                src={diamondRound}
                alt="Diamond icon"
                width="16"
                height="16"
              >
            </span>
            ${origin || "N/A"}
          </span>
        </td>
        <td>${d.carat ?? ""}</td>
        <td>${d.color ?? ""}</td>
        <td>${d.clarity ?? ""}</td>
        <td>
          <span class="media-icons">
            ${
              d.video_source
                ? `<button class="open-media video-trigger" data-video="${d.video_source}">
                     <svg class="icon-video" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                       <circle cx="12" cy="12" r="10" />
                       <polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none" />
                     </svg>
                   </button>`
                : ""
            }
            ${
              d.certificate_number
                ? `<a class="certificate-media" target="_blank" rel="noopener noreferrer"
                     href="https://www.igi.org/verify-your-report/?r=${d.certificate_number}">
                     <svg class="icon-document" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                       <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                       <polyline points="14 2 14 8 20 8" />
                       <line x1="8"  y1="13" x2="16" y2="13" />
                       <line x1="8"  y1="17" x2="16" y2="17" />
                       <line x1="8"  y1="9"  x2="12" y2="9"  />
                     </svg>
                   </a>`
                : ""
            }
          </span>
        </td>
        <td>
          <span class="col">
            $${d.price ?? ""}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
    diamondTableWrapperEl.classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("diamond:rendered"));
  }

  function renderPaginationControls(pagination) {
    if (!paginationWrapperEl) return;
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) {
      paginationWrapperEl.innerHTML = "";
      return;
    }
    let html = "";
    if (currentPage > 1)
      html += `<button data-page="${currentPage - 1}">&laquo; Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button data-page="${i}" ${i === currentPage ? 'style="font-weight:600;"' : ""}>${i}</button>`;
    }
    if (currentPage < totalPages)
      html += `<button data-page="${currentPage + 1}">Next &raquo;</button>`;
    paginationWrapperEl.innerHTML = html;
  }

  function clearAllDiamondSelections(exceptCheckbox) {
    document.querySelectorAll(".diamond-checkbox").forEach((cb) => {
      if (cb !== exceptCheckbox) {
        cb.checked = false;
        cb.closest("tr")?.classList.remove("checked");
      }
    });
  }

  function syncRowSelectionFromCheckbox(cb) {
    const row = cb.closest("tr");
    if (!row) return;
    row.classList.toggle("checked", cb.checked);
  }

  function handleSelectionChanged() {
    selectedDiamondData = getSelectedDiamondData();
    toggleDiamondSummaryDisplay();
    updateAddToCartButtonLabel();
    updateAddToCartButtonState();
  }

  function bindDiamondTableDelegates() {
    if (
      !diamondTableWrapperEl ||
      diamondTableWrapperEl.dataset.selectionBound === "true"
    )
      return;
    diamondTableWrapperEl.dataset.selectionBound = "true";
    diamondTableWrapperEl.addEventListener("change", (e) => {
      const cb = e.target.closest(".diamond-checkbox");
      if (!cb) return;
      clearAllDiamondSelections(cb);
      syncRowSelectionFromCheckbox(cb);
      handleSelectionChanged();
    });
    diamondTableWrapperEl.addEventListener("click", (e) => {
      if (e.target.closest(".open-media") || e.target.closest("a")) return;
      const row = e.target.closest("tr");
      if (!row) return;
      const cb = row.querySelector(".diamond-checkbox");
      if (!cb) return;
      cb.checked = !cb.checked;
      clearAllDiamondSelections(cb);
      syncRowSelectionFromCheckbox(cb);
      handleSelectionChanged();
    });
  }

  function initFilterTabsAndSlidersUI() {
    const filterButtons = document.querySelectorAll(".filter-btn");
    const sliderContainers = document.querySelectorAll(".slider-container");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        sliderContainers.forEach((container) => {
          container.classList.toggle("hidden", container.id !== target);
        });
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    function setupSlider(
      minId,
      maxId,
      trackId,
      inputMinId = null,
      inputMaxId = null,
    ) {
      const minEl = document.getElementById(minId);
      const maxEl = document.getElementById(maxId);
      const trackEl = document.getElementById(trackId);
      const inputMin = inputMinId ? document.getElementById(inputMinId) : null;
      const inputMax = inputMaxId ? document.getElementById(inputMaxId) : null;
      if (!minEl || !maxEl || !trackEl) return;
      function updateTrack() {
        const min = parseFloat(minEl.value);
        const max = parseFloat(maxEl.value);
        const minLimit = parseFloat(minEl.min);
        const maxLimit = parseFloat(maxEl.max);
        const range = maxLimit - minLimit;
        const leftPct = ((min - minLimit) / range) * 100;
        const rightPct = ((max - minLimit) / range) * 100;
        trackEl.style.left = `${leftPct}%`;
        trackEl.style.right = `${100 - rightPct}%`;
      }
      function syncInputs() {
        if (inputMin) inputMin.value = minEl.value;
        if (inputMax) inputMax.value = maxEl.value;
        updateTrack();
      }
      minEl.addEventListener("input", () => {
        if (+minEl.value > +maxEl.value) minEl.value = maxEl.value;
        syncInputs();
      });
      maxEl.addEventListener("input", () => {
        if (+maxEl.value < +minEl.value) maxEl.value = minEl.value;
        syncInputs();
      });
      if (inputMin && inputMax) {
        inputMin.addEventListener("input", () => {
          minEl.value = inputMin.value;
          syncInputs();
        });
        inputMax.addEventListener("input", () => {
          maxEl.value = inputMax.value;
          syncInputs();
        });
      }
      syncInputs();
    }
    setupSlider(
      "priceMin",
      "priceMax",
      "track-price",
      "priceMinInput",
      "priceMaxInput",
    );
    setupSlider(
      "caratMin",
      "caratMax",
      "track-carat",
      "caratMinInput",
      "caratMaxInput",
    );
    setupSlider("clarityMin", "clarityMax", "track-clarity");
    setupSlider("colorMin", "colorMax", "track-color");
  }

  async function loadDiamondsPage(page = 1) {
    currentPageNumber = page;
    showDiamondTableLoading();
    const filters = getFilterValuesObj();
    const { diamonds, pagination } = await fetchDiamondDataFromApi(
      filters,
      page,
      storeHandle,
    );
    window.fetchedDiamonds = diamonds;
    console.log("Fetched diamonds:", diamonds);
    hideDiamondTableLoading();

    renderDiamondTableHtml(diamonds);
    renderPaginationControls(pagination);
    updateAddToCartButtonState();
    bindDiamondTableDelegates();
  }

  async function initDiamondFilterData() {
    await loadDiamondsPage(1);
    if (paginationWrapperEl && !paginationWrapperEl.dataset.bound) {
      paginationWrapperEl.dataset.bound = "true";
      paginationWrapperEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        const page = parseInt(btn.getAttribute("data-page"), 10);
        if (!page) return;
        loadDiamondsPage(page);
      });
    }
    const reactiveIds = [
      "priceMin",
      "priceMax",
      "caratMin",
      "caratMax",
      "clarityMin",
      "clarityMax",
      "colorMin",
      "colorMax",
    ];
    const debouncedReload = debounceFn(() => loadDiamondsPage(1), 300);
    reactiveIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", debouncedReload);
    });
  }

  window.initDiamondFilter = initDiamondFilterData;

  (function initMediaPreview() {
    const modal = document.getElementById("sharedMediaModal");
    const iframe = document.getElementById("mediaPlayer");
    const closeBtn = modal?.querySelector(".media-close");
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".open-media,#see-diamond-btn");
      if (!btn) return;
      const videoUrl = btn.getAttribute("data-video");
      if (videoUrl) {
        if (iframe) iframe.src = videoUrl;
        if (modal) modal.classList.add("active");
      } else {
        alert("Video not available for this diamond.");
      }
    });
    closeBtn?.addEventListener("click", () => {
      if (modal) modal.classList.remove("active");
      if (iframe) iframe.src = "";
    });
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeBtn?.click();
    });
  })();

  function mapDiamondForProxy(diamond) {
    return {
      caratWeight: String(diamond.carat ?? ""),
      color: diamond.color ?? "",
      clarity: diamond.clarity ?? "",
      shape: diamond.shape ?? "Round",
      lab: diamond.lab ?? "IGI",
      type: diamond.type ?? "Natural",
      certificateNumber: diamond.certificate_number ?? "",
      price: String(diamond.price ?? "0.00"),
      images: [diamond.image || diamond.image_url || ""].filter(Boolean),
    };
  }

  async function createProductProxy(diamondPayload) {
    const proxyURL =
      "https://dev-by-chaman.myshopify.com/apps/diamond-selector/app/settings";
    try {
      const res = await fetch(proxyURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(diamondPayload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `Diamond product create failed (${res.status}): ${errText}`,
        );
      }
      const data = await res.json();
      console.log("Diamond product create response:", data);
      return data;
    } catch (err) {
      console.error("createProductProxy error:", err);
      return null;
    }
  }

  function extractVariantIdFromCreateResponse(data) {
    if (data?.variant?.variantId) return String(data.variant.variantId);
    const node = data?.product?.variants?.nodes?.[0];
    if (!node) return null;
    if (node.legacyResourceId) return String(node.legacyResourceId);
    if (node.id && typeof node.id === "string") {
      const parts = node.id.split("/");
      return parts[parts.length - 1] || null;
    }
    return null;
  }

  window.createProduct = createProductProxy;

  if (changeDiamondButton) {
    changeDiamondButton.addEventListener("click", () => {
      selectedDiamondData = null;
      toggleDiamondSummaryDisplay();
      updateAddToCartButtonLabel();
      updateAddToCartButtonState();
    });
  }

  if (addToCartButton) {
    addToCartButton.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!filtersAreVisible) {
        showElements(diamondContentSections);
        if (diamondTableWrapperEl)
          diamondTableWrapperEl.classList.remove("hidden");
        showDiamondTableLoading();
        filtersAreVisible = true;
        addToCartButton.disabled = true;
        if (!window.fetchedDiamonds) await initDiamondFilterData();
        hideDiamondTableLoading();
        updateAddToCartButtonLabel();
        updateAddToCartButtonState();
        return;
      }

      selectedDiamondData = getSelectedDiamondData();
      if (!selectedDiamondData) {
        alert("Please select a diamond before adding to cart.");
        return;
      }
      if (!variantIdInputEl?.value) {
        console.error("Missing main product variant ID.");
        alert("Unable to add ring to cart (missing variant).");
        return;
      }

      const { carat, color, clarity, certificate_number, shape, price } =
        selectedDiamondData;
      const formattedShape = shape
        ? shape.charAt(0).toUpperCase() + shape.slice(1).toLowerCase()
        : "Diamond";
      const formattedDescription = `${formattedShape} ${carat}ct , ${color}, ${clarity}`;
      const formattedCertificate = `${certificate_number}`;

      const originalText = addToCartButton.textContent;
      addToCartButton.disabled = true;

      const diamondPayload = mapDiamondForProxy(selectedDiamondData);
      const createResp = await createProductProxy(diamondPayload);

      if (!createResp) {
        alert("Failed to create diamond product. Please try again.");
        addToCartButton.disabled = false;
        addToCartButton.textContent = originalText;
        return;
      }
      if (createResp.error) {
        console.error("Diamond create error:", createResp);
        alert("Diamond product creation error. See console for details.");
        addToCartButton.disabled = false;
        addToCartButton.textContent = originalText;
        return;
      }

      const diamondVariantId = extractVariantIdFromCreateResponse(createResp);
      if (!diamondVariantId) {
        console.error(
          "No diamond variant ID found in create response:",
          createResp,
        );
        alert("Could not find diamond variant to add to cart.");
        addToCartButton.disabled = false;
        addToCartButton.textContent = originalText;
        return;
      }

      addToCartButton.textContent = "Adding...";
      const bundleToken = crypto?.randomUUID?.() || Date.now().toString();

      const cartPayload = {
        items: [
          {
            id: variantIdInputEl.value,
            quantity: 1,
            properties: {
              Diamond: formattedDescription,
              "Certificate Info": formattedCertificate,
              _bundle_token: bundleToken,
              _bundle_role: "ring",
              _diamond_price: price != null ? String(price) : "",
            },
          },
          {
            id: diamondVariantId,
            quantity: 1,
            properties: {
              _bundle_token: bundleToken,
              _bundle_role: "diamond",
            },
          },
        ],
      };

      try {
        const res = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cartPayload),
        });
        if (!res.ok) throw new Error(`Add to cart failed (${res.status})`);
        const data = await res.json();
        console.log("Ring + Diamond added to cart:", data);
        window.location.href = "/cart";
      } catch (err) {
        console.error("Add to cart failed", err);
        alert("Something went wrong adding to cart.");
        addToCartButton.disabled = false;
        addToCartButton.textContent = originalText;
      }
    });
  }

  hideElements(diamondContentSections);
  if (diamondTableWrapperEl) diamondTableWrapperEl.classList.add("hidden");
  if (diamondSummaryBoxEl) diamondSummaryBoxEl.classList.add("hidden");
  initFilterTabsAndSlidersUI();
  updateAddToCartButtonLabel();
  updateAddToCartButtonState();
});
