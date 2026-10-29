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
      <div class="product-art tilt-card"><span class="pack-badge">${product.badge}</span><span class="tilt-glare"></span></div>
      <div>
        <h3>${product.name}</h3>
        <span class="price">${formatMoney(product.price)}</span>
        <span class="each">· ${formatMoney(eachPrice)} each</span>
      </div>
      <div class="stepper">
        <button type="button" data-change="-1" aria-label="One less ${product.name}">−</button>
        <output aria-live="polite" class="digit-group">0</output>
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

/**
 * Swaps the text of a number and makes only the digits that changed pop in
 * (transitions.dev "number pop-in"). J$1,950 -> J$2,300: "J$" stays still, "2,300" pops.
 */
function popInNumber(element, newText) {
  const oldText = element.textContent;
  if (oldText === newText) return;

  // count how many characters at the start are the same in the old and new number
  let sameCount = 0;
  while (sameCount < oldText.length && oldText[sameCount] === newText[sameCount]) sameCount++;

  // one <span> per character; the unchanged ones are marked so they do not move
  element.classList.remove("is-animating");
  element.replaceChildren(...[...newText].map((character, index) => {
    const digit = document.createElement("span");
    digit.className = "digit";
    digit.textContent = character;
    if (index < sameCount) digit.dataset.same = "";
    digit.style.setProperty("--digit-order", Math.max(0, index - sameCount));
    return digit;
  }));
  void element.offsetWidth; // makes the browser restart the animation
  element.classList.add("is-animating");
}

/** Adds or removes one of a product when − or + is pressed, never going below zero. */
function changeQuantity(productId, change) {
  quantities[productId] = Math.max(0, Math.min(99, quantities[productId] + change));
  const card = document.querySelector(`[data-product="${productId}"]`);
  popInNumber(card.querySelector("output"), String(quantities[productId]));
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
  popInNumber(document.getElementById("summary-total"), formatMoney(total));
}

/** Shows (or clears) the red message under a field and outlines that field in red. */
function showFieldError(fieldId, message) {
  const errorText = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (!errorText) return; // this box has no error message (e.g. Notes)
  errorText.textContent = message;
  const input = document.getElementById(fieldId);
  input?.closest(".field")?.classList.toggle("has-error", Boolean(message));
}

/** Jiggles a box left-right once so the customer sees which one is wrong (transitions.dev "error state shake"). */
function shake(element) {
  element.classList.remove("is-shaking");
  void element.offsetWidth; // makes the browser restart the animation
  element.classList.add("is-shaking");
  element.addEventListener("animationend", () => element.classList.remove("is-shaking"), { once: true });
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
    problems.forEach(([fieldId, message]) => {
      showFieldError(fieldId, message);
      // shake the box itself, or the whole bottle picker when no bottles are picked
      const box = fieldId === "products" ? document.getElementById("products") : document.getElementById(fieldId);
      shake(box);
    });
    // jump to the first box that needs fixing
    const firstId = problems[0][0];
    const target = firstId === "products" ? document.getElementById("products") : document.getElementById(firstId);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (firstId !== "products") target.focus({ preventScroll: true });
    return;
  }

  const whatsappLink = `https://wa.me/${ORDER_PHONE_INTERNATIONAL}?text=${encodeURIComponent(orderMessage(form))}`;
  window.open(whatsappLink, "_blank", "noopener");
  showOrderSent();
}

/** Shows the "order sent" note and draws the green tick (transitions.dev "success check"). */
function showOrderSent() {
  document.getElementById("order-sent").hidden = false;
  const check = document.querySelector(".sent-check");
  check.dataset.state = "out";
  void check.getBoundingClientRect(); // makes the browser restart the animation if sent twice
  check.dataset.state = "in";
}

/**
 * Makes the bottle picture on each product card lean toward the mouse with a light glare
 * (transitions.dev "card hover tilt"). Mouse only, so phones still scroll normally.
 */
function watchCardTilt() {
  const MAX_TILT_DEGREES = 14;
  document.querySelectorAll(".product").forEach((product) => {
    const card = product.querySelector(".tilt-card");

    product.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const box = card.getBoundingClientRect();
      // where the mouse is across the picture, 0 (left/top) to 1 (right/bottom)
      const across = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const down = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
      product.classList.add("is-hover");
      card.classList.add("is-tilting");
      card.style.setProperty("--tilt-ry", ((across - 0.5) * MAX_TILT_DEGREES).toFixed(2) + "deg");
      card.style.setProperty("--tilt-rx", ((0.5 - down) * MAX_TILT_DEGREES).toFixed(2) + "deg");
      card.style.setProperty("--tilt-gx", (across * 100).toFixed(1) + "%");
      card.style.setProperty("--tilt-gy", (down * 100).toFixed(1) + "%");
    });

    // mouse leaves: the picture eases back flat
    product.addEventListener("pointerleave", () => {
      product.classList.remove("is-hover");
      card.classList.remove("is-tilting");
      card.style.setProperty("--tilt-rx", "0deg");
      card.style.setProperty("--tilt-ry", "0deg");
    });
  });
}

/** Fades blocks in as they scroll into view. Items in a list come in one after another. */
function watchReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((element) => {
    // position among its revealing neighbours (0, 1, 2…) sets how long it waits
    const neighbours = [...element.parentElement.children].filter((child) => child.classList.contains("reveal"));
    element.style.setProperty("--reveal-order", Math.min(neighbours.indexOf(element), 6));
    observer.observe(element);
  });
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
  watchCardTilt();
});
