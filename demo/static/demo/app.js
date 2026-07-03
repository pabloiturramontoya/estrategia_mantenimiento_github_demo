const state = {
  raw: [],
  filtered: [],
  charts: {
    scatter: null,
    bar: null,
    top: null,
    detail: null,
  },
  detailContext: null,
};

const LABELS = {
  anio: "Ano",
  mes: "Mes",
  semana: "Semana",
  responsable: "Responsable",
};

const els = {
  kpiCards: document.getElementById("kpi-cards"),
  recordsCount: document.getElementById("records-count"),
  recordsBody: document.getElementById("records-body"),
  filterLinea: document.getElementById("filter-linea"),
  filterEquipo: document.getElementById("filter-equipo"),
  filterDuracion: document.getElementById("filter-duracion"),
  applyFilters: document.getElementById("apply-filters"),
  scatterCount: document.getElementById("scatter-count"),
  scatterTitleSuffix: document.getElementById("scatter-title-suffix"),
  barTitleSuffix: document.getElementById("bar-title-suffix"),
  malosTopEmpty: document.getElementById("malos-top-empty"),
  detailTitle: document.getElementById("detail-title"),
  detailSubtitle: document.getElementById("detail-subtitle"),
  detailCount: document.getElementById("detail-count"),
  detailFrom: document.getElementById("detail-from"),
  detailTo: document.getElementById("detail-to"),
  applyDetailFilter: document.getElementById("apply-detail-filter"),
  modalRecordsBody: document.getElementById("modal-records-body"),
  detailModal: document.getElementById("modal-detail"),
};

function uniq(values) {
  return [...new Set(values)].filter((value) => value !== null && value !== undefined && value !== "").sort();
}

function average(list) {
  if (!list.length) return 0;
  return list.reduce((acc, value) => acc + value, 0) / list.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toMinutes(hours) {
  return Number((Number(hours || 0) * 60).toFixed(1));
}

function formatDate(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString("es-CL");
}

function formatDateTime(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isoMonth(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getIsoWeek(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "";
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return String(week).padStart(2, "0");
}

function normalizeRecord(item) {
  const start = new Date(item.fecha_hora_inicio);
  const fallbackYear = !Number.isNaN(start.getTime()) ? String(start.getFullYear()) : "";
  return {
    ...item,
    anio: item.anio || fallbackYear,
    semana: item.semana || getIsoWeek(item.fecha_hora_inicio),
    month: item.month || isoMonth(item.fecha_hora_inicio),
  };
}

function destroyChart(chart) {
  if (chart) chart.destroy();
}

function getCheckedValues(group) {
  const checks = Array.from(document.querySelectorAll(`input[data-filter-group="${group}"]`));
  const selected = checks.filter((input) => input.checked).map((input) => input.value);
  if (selected.includes("Todos") || !selected.length) return ["Todos"];
  return selected;
}

function setDropdownButtonLabel(group) {
  const button = document.getElementById(`btn-${group}`);
  const values = getCheckedValues(group).filter((value) => value !== "Todos");
  let label = `${LABELS[group]}: `;
  if (!values.length) {
    label += "Todos";
  } else if (values.length <= 2) {
    label += values.join(", ");
  } else {
    label += `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
  }
  button.textContent = label;
}

function renderCheckboxDropdown(group, values) {
  const dropdown = document.querySelector(`.portal-dropdown[data-group="${group}"] .dropdown-menu`);
  dropdown.innerHTML = "";
  const allLabel = document.createElement("label");
  allLabel.className = "dropdown-item d-flex align-items-center";
  allLabel.innerHTML = `<input class="form-check-input me-2" type="checkbox" value="Todos" data-filter-group="${group}" checked> Todos`;
  dropdown.appendChild(allLabel);

  values.forEach((value) => {
    const label = document.createElement("label");
    label.className = "dropdown-item d-flex align-items-center";
    label.innerHTML = `<input class="form-check-input me-2" type="checkbox" value="${value}" data-filter-group="${group}"> ${value}`;
    dropdown.appendChild(label);
  });

  dropdown.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const checks = Array.from(dropdown.querySelectorAll("input"));
      if (event.target.value === "Todos" && event.target.checked) {
        checks.forEach((item) => {
          if (item !== event.target) item.checked = false;
        });
      } else if (event.target.value !== "Todos" && event.target.checked) {
        const all = checks.find((item) => item.value === "Todos");
        if (all) all.checked = false;
      }
      const nonAllChecked = checks.filter((item) => item.value !== "Todos" && item.checked);
      const all = checks.find((item) => item.value === "Todos");
      if (!nonAllChecked.length && all) all.checked = true;
      setDropdownButtonLabel(group);
    });
  });

  setDropdownButtonLabel(group);
}

function renderSimpleSelect(select, values, allLabel = "Todos") {
  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "Todos";
  defaultOption.textContent = allLabel;
  select.appendChild(defaultOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function bindDropdownPortals() {
  document.querySelectorAll(".portal-dropdown").forEach((dropdown) => {
    const button = dropdown.querySelector("[data-bs-toggle='dropdown']");
    const menu = dropdown.querySelector(".dropdown-menu");
    const placeholder = document.createElement("div");
    placeholder.style.display = "none";
    button.addEventListener("show.bs.dropdown", () => {
      menu.after(placeholder);
      const rect = button.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom}px`;
      menu.style.width = `${rect.width}px`;
      menu.style.zIndex = "1040";
      document.body.appendChild(menu);
    });
    button.addEventListener("hide.bs.dropdown", () => {
      placeholder.replaceWith(menu);
      menu.removeAttribute("style");
    });
  });
}

function getFilters() {
  return {
    anio: getCheckedValues("anio"),
    mes: getCheckedValues("mes"),
    semana: getCheckedValues("semana"),
    responsable: getCheckedValues("responsable"),
    linea: els.filterLinea.value,
    equipo: els.filterEquipo.value,
    duracion: Number(els.filterDuracion.value || 0),
  };
}

function matchesMulti(values, current) {
  return values.includes("Todos") || values.includes(String(current));
}

function applyFilters() {
  const filters = getFilters();
  state.filtered = state.raw.filter((item) => {
    if (!matchesMulti(filters.anio, item.anio)) return false;
    if (!matchesMulti(filters.mes, item.month)) return false;
    if (!matchesMulti(filters.semana, item.semana)) return false;
    if (!matchesMulti(filters.responsable, item.responsable)) return false;
    if (filters.linea !== "Todos" && item.linea !== filters.linea) return false;
    if (filters.equipo !== "Todos" && item.equipo !== filters.equipo) return false;
    if (filters.duracion > 0 && toMinutes(item.duracion_horas) > filters.duracion) return false;
    return true;
  });
  renderAll();
}

function groupByEquipment(records) {
  const grouped = new Map();
  records.forEach((item) => {
    if (!grouped.has(item.equipo)) grouped.set(item.equipo, []);
    grouped.get(item.equipo).push(item);
  });

  return [...grouped.entries()].map(([equipo, items], index) => {
    const durations = items.map((item) => toMinutes(item.duracion_horas));
    const totalMinutes = durations.reduce((acc, value) => acc + value, 0);
    const recurrence = items.length;
    const velocity = average(durations);
    const demoSeverity = clamp((recurrence * 16) + (velocity * 0.35) + (index % 3) * 4, 14, 96);
    const demoImpact = clamp((totalMinutes * 0.62) + recurrence * 18 + (index % 4) * 11, 24, 380);
    const demoStability = clamp(100 - demoSeverity + recurrence * 2.5, 22, 96);
    return {
      equipo,
      items,
      recurrence,
      velocity,
      demoSeverity,
      demoImpact,
      demoStability,
    };
  }).sort((a, b) => b.demoImpact - a.demoImpact);
}

function computeKpis(records) {
  const grouped = groupByEquipment(records);
  const durations = records.map((item) => toMinutes(item.duracion_horas));
  const avgDuration = average(durations);
  const totalEvents = records.length;
  const uniqueTeams = uniq(records.map((item) => item.responsable)).length || 1;
  const weeks = uniq(records.map((item) => item.semana)).length || 1;
  const demoHealth = clamp(88 - avgDuration * 0.06 - totalEvents * 0.45 + uniqueTeams * 1.7, 47, 97);
  const responsePulse = clamp(42 + avgDuration * 0.38 + weeks * 3.2, 18, 96);
  const continuity = clamp(61 + grouped.length * 2.4 - totalEvents * 0.7, 28, 94);
  const attentionLoad = clamp((durations.reduce((acc, value) => acc + value, 0) / (weeks * 12 || 1)), 18, 180);
  const scenarioMix = clamp(grouped.length * 7 + uniqueTeams * 4 + weeks * 3, 12, 92);

  return [
    { label: "Salud del escenario", value: `${demoHealth.toFixed(1)} %`, badge: "demo", sub: "Indice visual sintetico" },
    { label: "Pulso de respuesta", value: `${responsePulse.toFixed(1)}`, badge: "demo", sub: "Carga media por ventana" },
    { label: "Continuidad proyectada", value: `${continuity.toFixed(1)} %`, badge: "demo", sub: "Estabilidad demostrativa" },
    { label: "Carga de atencion", value: `${attentionLoad.toFixed(1)}`, badge: "demo", sub: "Intensidad visual acumulada" },
    { label: "Diversidad de escenarios", value: `${scenarioMix.toFixed(0)}`, badge: "demo", sub: `${totalEvents} eventos sinteticos` },
  ];
}

function renderKpis() {
  const kpis = computeKpis(state.filtered);
  els.kpiCards.innerHTML = "";
  kpis.forEach((kpi) => {
    const wrapper = document.createElement("div");
    wrapper.className = "kpi-card";
    wrapper.innerHTML = `
      <button type="button" class="btn metric-button w-100 text-start">
        <div class="card shadow-sm h-100">
          <div class="metric-card-body">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-0 section-title">${kpi.label}</h6>
              <span class="badge bg-light text-dark">${kpi.badge}</span>
            </div>
            <div class="metric-value">${kpi.value}</div>
            <div class="metric-sub">${kpi.sub}</div>
          </div>
        </div>
      </button>
    `;
    els.kpiCards.appendChild(wrapper);
  });
}

function renderScatter() {
  const grouped = groupByEquipment(state.filtered);
  const ctx = document.getElementById("chart-equipos-log2");
  destroyChart(state.charts.scatter);
  els.scatterCount.textContent = `(${grouped.length})`;
  state.charts.scatter = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Mapa demo",
        data: grouped.map((item) => ({
          x: item.recurrence * 10 + 6,
          y: item.demoSeverity,
          equipo: item.equipo,
        })),
        backgroundColor: "rgba(37, 99, 235, 0.32)",
        borderColor: "rgba(15, 118, 110, 0.95)",
        pointRadius: 7,
        pointHoverRadius: 9,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: "Recurrencia demo" }, beginAtZero: true },
        y: { title: { display: true, text: "Severidad visual" }, beginAtZero: true, max: 100 },
      },
      onClick: (_event, elements) => {
        if (!elements.length) return;
        const selected = grouped[elements[0].index];
        if (selected) openDetailModal(selected);
      },
    },
  });
}

function renderImpactBars() {
  const grouped = groupByEquipment(state.filtered).slice(0, 10);
  const ctx = document.getElementById("chart-tfs-bar");
  destroyChart(state.charts.bar);
  state.charts.bar = new Chart(ctx, {
    type: "bar",
    data: {
      labels: grouped.map((item) => item.equipo),
      datasets: [{
        label: "Impacto visual",
        data: grouped.map((item) => Number(item.demoImpact.toFixed(1))),
        backgroundColor: [
          "rgba(37, 99, 235, 0.70)",
          "rgba(15, 118, 110, 0.70)",
          "rgba(245, 158, 11, 0.70)",
          "rgba(14, 165, 233, 0.70)",
          "rgba(59, 130, 246, 0.70)",
        ],
        borderRadius: 10,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Puntaje demo" } },
      },
    },
  });
}

function renderTopActors() {
  const grouped = groupByEquipment(state.filtered)
    .sort((a, b) => (b.demoSeverity + b.demoImpact) - (a.demoSeverity + a.demoImpact))
    .slice(0, 10);
  const ctx = document.getElementById("chart-malos-top");
  destroyChart(state.charts.top);
  if (!grouped.length) {
    els.malosTopEmpty.classList.remove("d-none");
    return;
  }
  els.malosTopEmpty.classList.add("d-none");
  state.charts.top = new Chart(ctx, {
    type: "bar",
    data: {
      labels: grouped.map((item) => item.equipo),
      datasets: [{
        label: "Jerarquia visual",
        data: grouped.map((item) => Number((item.demoSeverity + item.demoImpact * 0.35).toFixed(1))),
        backgroundColor: "rgba(15, 118, 110, 0.72)",
        borderRadius: 10,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Puntaje sintetico" } },
      },
    },
  });
}

function renderRecordsTable() {
  const ordered = state.filtered.slice().sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio));
  els.recordsCount.textContent = `${ordered.length} registros demo`;
  els.recordsBody.innerHTML = "";
  ordered.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDateTime(item.fecha_hora_inicio)}</td>
      <td>${formatDateTime(item.fecha_hora_termino)}</td>
      <td>${item.linea}</td>
      <td>${item.equipo}</td>
      <td>${item.falla}</td>
      <td>${item.responsable}</td>
      <td>${toMinutes(item.duracion_horas).toFixed(1)}</td>
    `;
    els.recordsBody.appendChild(row);
  });
}

function renderAll() {
  const uniqueMonths = uniq(state.filtered.map((item) => item.month));
  els.scatterTitleSuffix.textContent = uniqueMonths.length ? `· ${uniqueMonths.join(", ")}` : "";
  els.barTitleSuffix.textContent = uniqueMonths.length ? `· ${uniqueMonths.join(", ")}` : "";
  renderKpis();
  renderScatter();
  renderImpactBars();
  renderTopActors();
  renderRecordsTable();
}

function getMostFrequentFailure(records) {
  const counter = records.reduce((acc, item) => {
    acc[item.falla] = (acc[item.falla] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counter).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sin falla";
}

function renderDetail(records) {
  const from = els.detailFrom.value;
  const to = els.detailTo.value;
  const filtered = records.filter((item) => {
    const month = isoMonth(item.fecha_hora_inicio);
    if (from && month < from) return false;
    if (to && month > to) return false;
    return true;
  });

  els.detailCount.textContent = `${filtered.length} eventos demo`;
  els.modalRecordsBody.innerHTML = "";
  filtered.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDateTime(item.fecha_hora_inicio)}</td>
      <td>${item.falla}</td>
      <td>${toMinutes(item.duracion_horas).toFixed(1)}</td>
    `;
    els.modalRecordsBody.appendChild(row);
  });

  const ctx = document.getElementById("detail-line-chart");
  destroyChart(state.charts.detail);
  state.charts.detail = new Chart(ctx, {
    type: "line",
    data: {
      labels: filtered.map((item) => formatDate(item.fecha_hora_inicio)),
      datasets: [{
        label: "Duracion demo",
        data: filtered.map((item, index) => Number((toMinutes(item.duracion_horas) + (index % 3) * 4).toFixed(1))),
        borderColor: "rgba(37, 99, 235, 1)",
        backgroundColor: "rgba(37, 99, 235, 0.10)",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.34,
        fill: true,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: "Fecha" } },
        y: { title: { display: true, text: "Duracion visual" }, beginAtZero: true },
      },
    },
  });
}

function openDetailModal(groupedItem) {
  const mostFrequentFailure = getMostFrequentFailure(groupedItem.items);
  const records = groupedItem.items
    .filter((item) => item.falla === mostFrequentFailure)
    .sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio));

  state.detailContext = { equipo: groupedItem.equipo, falla: mostFrequentFailure, records };
  els.detailTitle.textContent = `${groupedItem.equipo} · ${mostFrequentFailure}`;
  els.detailSubtitle.textContent = "Serie sintetica de navegacion para modo de falla dominante";

  const months = uniq(records.map((item) => isoMonth(item.fecha_hora_inicio)));
  els.detailFrom.value = months[0] || "";
  els.detailTo.value = months[months.length - 1] || "";
  renderDetail(records);

  bootstrap.Modal.getOrCreateInstance(els.detailModal).show();
}

function bindEvents() {
  els.applyFilters.addEventListener("click", applyFilters);
  els.filterLinea.addEventListener("change", applyFilters);
  els.filterEquipo.addEventListener("change", applyFilters);
  els.applyDetailFilter.addEventListener("click", () => {
    if (!state.detailContext) return;
    renderDetail(state.detailContext.records);
  });
}

async function init() {
  const response = await fetch(window.DEMO_DATA_URL);
  const payload = await response.json();
  state.raw = (payload.records || []).map(normalizeRecord);
  state.filtered = [...state.raw];

  renderCheckboxDropdown("anio", uniq(state.raw.map((item) => item.anio)));
  renderCheckboxDropdown("mes", uniq(state.raw.map((item) => item.month)));
  renderCheckboxDropdown("semana", uniq(state.raw.map((item) => item.semana)));
  renderCheckboxDropdown("responsable", uniq(state.raw.map((item) => item.responsable)));
  renderSimpleSelect(els.filterLinea, uniq(state.raw.map((item) => item.linea)));
  renderSimpleSelect(els.filterEquipo, uniq(state.raw.map((item) => item.equipo)));
  bindDropdownPortals();
  bindEvents();
  renderAll();
}

init();
