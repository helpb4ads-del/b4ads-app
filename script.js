"use strict";
const form = document.querySelector("#campaign-form");
form.noValidate = true;
const steps = [...document.querySelectorAll(".step")];
const error = document.querySelector("#form-error");
const progress = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const back = document.querySelector("#back-btn");
const next = document.querySelector("#next-btn");
const review = document.querySelector("#review-btn");
const ruleSelect = document.querySelector("#stop-rule");
const ruleFields = document.querySelector("#rule-fields");
let currentStep = 0;

function showStep(index) {
  currentStep = index;
  steps.forEach((step, i) => { step.hidden = i !== index; });
  back.hidden = index === 0;
  next.hidden = index === steps.length - 1;
  review.hidden = index !== steps.length - 1;
  progress.style.width = ((index + 1) / steps.length * 100) + "%";
  progressLabel.textContent = "Paso " + (index + 1) + " de " + steps.length;
  error.textContent = "";
  document.querySelector("#crear").scrollIntoView({ behavior: "smooth", block: "start" });
}

function validateStep(index) {
  const data = new FormData(form);
  if (index === 0 && (!data.getAll("platform").length || !data.get("goal"))) return "Elige al menos una plataforma y un objetivo.";
  if (index === 1) {
    for (const field of ["business", "product", "offer", "destination"]) {
      if (!String(data.get(field) || "").trim()) return "Completa todos los datos de tu negocio y el enlace de destino.";
    }
    try {
      const url = new URL(String(data.get("destination")));
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".")) throw Error();
    } catch { return "Escribe un enlace válido que comience por https://"; }
  }
  if (index === 2 && !data.get("format")) return "Elige un formato para continuar.";
  if (index === 3) {
    const budget = Number(data.get("budget"));
    const days = Number(data.get("days"));
    if (!Number.isFinite(budget) || budget < 1 || !Number.isFinite(days) || !Number.isInteger(days) || days < 1 || days > 365) return "Indica un presupuesto mínimo de USD 1 y una duración entre 1 y 365 días.";
    if (!data.get("stopRule")) return "Elige una condición de protección.";
    if (data.get("stopRule") === "no-results" && !(Number(data.get("waitDays")) >= 1 && Number(data.get("waitDays")) <= days)) return "El plazo sin resultados debe estar entre 1 día y la duración de la campaña.";
    if (data.get("stopRule") === "cpa" && !(Number(data.get("maxCpa")) > 0)) return "Indica un costo máximo por resultado mayor que cero.";
  }
  return "";
}

next.addEventListener("click", () => {
  error.textContent = validateStep(currentStep);
  if (!error.textContent) showStep(currentStep + 1);
});
back.addEventListener("click", () => showStep(currentStep - 1));

document.querySelectorAll('input[name="goal"]').forEach(input => input.addEventListener("change", () => {
  const tips = {
    "Ventas o conversiones": "Ideal cuando quieres compras, reservas o registros medibles. Para medirlos se necesitará configurar los eventos.",
    "Interacción": "Útil si buscas comentarios, mensajes o participación con tu contenido.",
    "Tráfico": "Ayuda a llevar personas a una página o tienda en línea.",
    "Reconocimiento": "Ayuda a que más personas conozcan tu marca."
  };
  document.querySelector("#goal-tip").textContent = tips[input.value];
}));

ruleSelect.addEventListener("change", () => {
  ruleFields.replaceChildren();
  if (ruleSelect.value === "no-results" || ruleSelect.value === "cpa") {
    const label = document.createElement("label");
    const input = document.createElement("input");
    label.textContent = ruleSelect.value === "no-results" ? "¿Cuántos días sin resultados?" : "Costo máximo por resultado (USD)";
    input.type = "number";
    input.min = ruleSelect.value === "no-results" ? "1" : "0.01";
    input.step = ruleSelect.value === "no-results" ? "1" : "0.01";
    input.name = ruleSelect.value === "no-results" ? "waitDays" : "maxCpa";
    input.placeholder = ruleSelect.value === "no-results" ? "Ej. 3" : "Ej. 10";
    label.append(input);
    ruleFields.append(label);
  }
});

function makeSummaryRow(parent, label, value) {
  const box = document.createElement("div");
  const small = document.createElement("small");
  const strong = document.createElement("strong");
  small.textContent = label;
  strong.textContent = value;
  box.append(small, strong);
  parent.append(box);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  error.textContent = validateStep(currentStep);
  if (error.textContent) return;
  const data = new FormData(form);
  const daily = Number(data.get("budget"));
  const days = Number(data.get("days"));
  const rule = data.get("stopRule") === "no-results"
    ? "Pausar tras " + data.get("waitDays") + " día(s) sin resultados"
    : data.get("stopRule") === "cpa"
      ? "Pausar si el costo por resultado supera USD " + Number(data.get("maxCpa")).toFixed(2)
      : "Pendiente de definir antes de publicar";
  const business = String(data.get("business")).trim();
  const product = String(data.get("product")).trim();
  const offer = String(data.get("offer")).trim();
  const copy = business + " presenta " + product + ". " + offer + "\nConoce más: " + data.get("destination");
  const summary = document.querySelector("#summary");
  summary.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "summary-grid";
  [
    ["Plataforma", data.getAll("platform").join(" y ")],
    ["Objetivo", data.get("goal")],
    ["Formato deseado", data.get("format") + " · " + data.get("source")],
    ["Presupuesto", "USD " + daily.toFixed(2) + "/día · " + days + " días · máximo estimado USD " + (daily * days).toFixed(2)],
    ["Protección prevista", rule],
    ["Estado", "Borrador; cuentas y medición pendientes"]
  ].forEach(([label, value]) => makeSummaryRow(grid, label, String(value)));
  const copyBox = document.createElement("div");
  copyBox.className = "summary-copy";
  const heading = document.createElement("strong");
  heading.textContent = "Texto base sugerido (editable en una próxima versión)";
  const paragraph = document.createElement("p");
  paragraph.textContent = copy;
  copyBox.append(heading, paragraph);
  const note = document.createElement("p");
  note.className = "draft-note";
  note.textContent = "Este es un borrador local. No se han creado piezas por IA, gastado tokens, publicado anuncios ni activado una regla de apagado.";
  summary.append(grid, copyBox, note);
  summary.hidden = false;
  document.querySelector("#draft-status").textContent = "Revisa la configuración inicial de tu campaña.";
  try {
    localStorage.setItem("b4ads-draft", JSON.stringify({
      platforms: data.getAll("platform"), goal: data.get("goal"), business, product, offer,
      destination: data.get("destination"), format: data.get("format"), source: data.get("source"),
      budget: daily, days, stopRule: data.get("stopRule"),
      waitDays: data.get("waitDays"), maxCpa: data.get("maxCpa")
    }));
  } catch { note.textContent += " Tu navegador no permitió guardar el borrador."; }
  document.querySelector("#campanas").scrollIntoView({ behavior: "smooth" });
});

try {
  const draft = JSON.parse(localStorage.getItem("b4ads-draft") || "null");
  if (draft && typeof draft === "object") {
    document.querySelector("#draft-status").textContent = "Hay un borrador guardado en este navegador de " + String(draft.business || "tu negocio") + ". Completa el formulario para generar un resumen actualizado.";
    for (const [name, value] of Object.entries(draft)) {
      if (name === "platforms") {
        document.querySelectorAll('input[name="platform"]').forEach(input => { input.checked = value.includes(input.value); });
      } else if (["goal", "format"].includes(name)) {
        document.querySelectorAll('input[name="' + name + '"]').forEach(input => { input.checked = input.value === value; if (input.checked) input.dispatchEvent(new Event("change")); });
      } else {
        const input = form.elements.namedItem(name);
        if (input && value != null) { input.value = value; if (name === "stopRule") input.dispatchEvent(new Event("change")); }
      }
    }
    for (const name of ["waitDays", "maxCpa"]) {
      const input = form.elements.namedItem(name);
      if (input && draft[name] != null) input.value = draft[name];
    }
  }
} catch { /* An unavailable or old local draft does not block the form. */ }