/* =========================================================
   Jelly Water — order form
   Builds the product cards, keeps the running total, checks
   the form, then opens WhatsApp with the order typed in.
   There is no server: the order goes to the business on WhatsApp.
   ========================================================= */

/* The business WhatsApp / phone number in international format (Jamaica = 1 876) */
const ORDER_PHONE_INTERNATIONAL = "18764644762";

/* What can be ordered. Change the prices here and the whole page updates. */
const PRODUCTS = [
  { id: "single", name: "Single bottle", badge: "600 mL", bottles: 1, price: 350 },
  { id: "six", name: "6-pack", badge: "Save J$150", bottles: 6, price: 1950 },
  { id: "twelve", name: "12-pack", badge: "Best value", bottles: 12, price: 3600 },
];

/* All 14 parishes, for the delivery dropdown */
const PARISHES = [
  "Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. Elizabeth", "Westmoreland",
  "Hanover", "St. James", "Trelawny", "St. Ann", "St. Mary", "Portland", "St. Thomas",
];

/* How many of each product the customer has picked, e.g. { single: 2, six: 0, twelve: 1 } */
const quantities = Object.fromEntries(PRODUCTS.map((product) => [product.id, 0]));

/** Formats a number as Jamaican dollars, e.g. 1950 -> "J$1,950". */
function formatMoney(amount) {
  return "J$" + amount.toLocaleString("en-JM");
}

/** Draws one product card with its picture, price and a − / + quantity stepper. */
function productCardHtml(product) {
  const eachPrice = Math.round(product.price / product.bottles);
  return `
    <div class="product" data-product="${product.id}">
      <div class="product-art"><span class="pack-badge">${product.badge}</span></div>
      <div>
        <h3>${product.name}</h3>
        <span class="price">${formatMoney(product.price)}</span>
        <span class="each">· ${formatMoney(eachPrice)} each</span>
      </div>
      <div class="stepper">
        <button type="button" data-change="-1" aria-label="One less ${product.name}">−</button>
        <output aria-live="polite">0</output>
        <button type="button" data-change="1" aria-label="One more ${product.name}">+</button>
      </div>
    </div>`;
}

/** Puts the product cards and the parish list into the page. */
function buildForm() {
  const productArea = document.getElementById("products");
  productArea.insertAdjacentHTML("beforeend", PRODUCTS.map(productCardHtml).join(""));

  const parishSelect = document.getElementById("customer-parish");
  PARISHES.forEach((parish) => parishSelect.add(new Option(parish, parish)));
}

/** Adds or removes one of a product when − or + is pressed, never going below zero. */
function changeQuantity(productId, change) {
  quantities[productId] = Math.max(0, Math.min(99, quantities[productId] + change));
  const card = document.querySelector(`[data-product="${productId}"]`);
  card.querySelector("output").textContent = quantities[productId];
  card.classList.toggle("is-picked", quantities[productId] > 0);
  showFieldError("products", "");
  updateSummary();
}

/** Returns only the products with a quantity above zero, with their line totals. */
function pickedLines() {
  return PRODUCTS.filter((product) => quantities[product.id] > 0).map((product) => ({
    product,
    quantity: quantities[product.id],
    lineTotal: quantities[product.id] * product.price,
  }));
}

/** Re-draws the order summary list and the total. */
function updateSummary() {
  const lines = pickedLines();
  const list = document.getElementById("summary-lines");
  list.innerHTML = lines.length
    ? lines.map((line) => `<li><span>${line.quantity} × ${line.product.name}</span><b>${formatMoney(line.lineTotal)}</b></li>`).join("")
    : '<li class="summary-empty">No bottles picked yet.</li>';
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  document.getElementById("summary-total").textContent = formatMoney(total);
}

/** Shows (or clears) the red message under a field and outlines that field in red. */
function showFieldError(fieldId, message) {
  const errorText = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (!errorText) return; // this box has no error message (e.g. Notes)
  errorText.textContent = message;
  const input = document.getElementById(fieldId);
  input?.closest(".field")?.classList.toggle("has-error", Boolean(message));
}

/** Checks every required box. Each problem names the box and says what is wrong. */
function findProblems(form) {
  const problems = [];
  const digits = form.phone.value.replace(/\D/g, "");
  if (pickedLines().length === 0) problems.push(["products", "Pick at least one bottle or pack using the + button."]);
  if (form.name.value.trim().length < 2) problems.push(["customer-name", "Full name: please type your name."]);
  if (digits.length < 7 || digits.length > 11) problems.push(["customer-phone", "Phone number: type a 7–10 digit number, e.g. 876 555 1234."]);
  if (!form.parish.value) problems.push(["customer-parish", "Parish: choose where we are delivering."]);
  if (form.address.value.trim().length < 5) problems.push(["customer-address", "Delivery address: type the street and district."]);
  return problems;
}

/** Writes the order out as a neat WhatsApp message. */
function orderMessage(form) {
  const lines = pickedLines();
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemLines = lines.map((line) => `• ${line.quantity} × ${line.product.name} — ${formatMoney(line.lineTotal)}`);
  const notes = form.notes.value.trim();
  return [
    "Hi Jelly Water! I would like to order:",
    ...itemLines,
    `Total: ${formatMoney(total)}`,
    "",
    `Name: ${form.name.value.trim()}`,
    `Phone: ${form.phone.value.trim()}`,
    `Deliver to: ${form.address.value.trim()}, ${form.parish.value}`,
    notes ? `Notes: ${notes}` : "",
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

/** When "Send order" is pressed: check the form, then open WhatsApp with the order. */
function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  // clear old messages first
  ["products", "customer-name", "customer-phone", "customer-parish", "customer-address"].forEach((id) => showFieldError(id, ""));

  const problems = findProblems(form);
  if (problems.length > 0) {
    problems.forEach(([fieldId, message]) => showFieldError(fieldId, message));
    // jump to the first box that needs fixing
    const firstId = problems[0][0];
    const target = firstId === "products" ? document.getElementById("products") : document.getElementById(firstId);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (firstId !== "products") target.focus({ preventScroll: true });
    return;
  }

  const whatsappLink = `https://wa.me/${ORDER_PHONE_INTERNATIONAL}?text=${encodeURIComponent(orderMessage(form))}`;
  window.open(whatsappLink, "_blank", "noopener");
  document.getElementById("order-sent").hidden = false;
}

/** Fades blocks in as they scroll into view. */
function watchReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

/* ---------- Start everything once the page has loaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  buildForm();

  // one click handler for every − / + button
  document.getElementById("products").addEventListener("click", (event) => {
    const button = event.target.closest("[data-change]");
    if (!button) return;
    changeQuantity(button.closest("[data-product]").dataset.product, Number(button.dataset.change));
  });

  // clear a field's red message as soon as the customer starts fixing it
  document.getElementById("order-form").addEventListener("input", (event) => {
    if (event.target.id) showFieldError(event.target.id, "");
  });

  document.getElementById("order-form").addEventListener("submit", handleSubmit);
  watchReveals();
});
