/* =========================================================
   Jelly Water — moving text
   Recipes adapted from transitions.dev:
   - headings rise in word by word ("texts reveal")
   - the promise quote writes itself word by word ("streaming text")
   - the green word in the hero headline keeps changing ("text states swap")
   - the hero numbers count up when the page opens
   People who turn motion off in their settings just see the plain text.
   ========================================================= */

/* true when the visitor asked their phone/computer for less motion */
const PREFERS_LESS_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* the words the hero headline cycles through in "Pure ___." */
const HERO_WORDS = ["coconut.", "Jamaican.", "goodness."]; // all short enough to stay on one line, so the page never jumps
const HERO_WORD_HOLD_MS = 2600; // how long each word stays before the next one
const HERO_WORD_SWAP_MS = 260;  // how long the old word takes to fade out (matches .swap-word in site.css)

/**
 * Wraps every word inside an element in its own <span class="word">, keeping
 * any styling tags (like <em>) around them. Each word is numbered so CSS can
 * hold it back a little longer than the one before.
 */
function splitIntoWords(element, startNumber = 0) {
  let wordNumber = startNumber;
  // go through the text pieces one by one (a copy, because we change the page as we go)
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textPieces = [];
  while (walker.nextNode()) textPieces.push(walker.currentNode);

  textPieces.forEach((textPiece) => {
    // skip text inside the changing hero word, it animates on its own
    if (textPiece.parentElement.closest(".swap-word")) return;
    const parts = textPiece.textContent.split(/(\s+)/); // keep the spaces between words
    const pieces = parts.map((part) => {
      if (part.trim() === "") return document.createTextNode(part);
      const word = document.createElement("span");
      word.className = "word";
      word.textContent = part;
      word.style.setProperty("--word-order", wordNumber++);
      return word;
    });
    textPiece.replaceWith(...pieces);
  });
  return wordNumber;
}

/** Plays the word-by-word entrance on an element once it scrolls into view. */
function revealWhenSeen(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("words-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  elements.forEach((element) => observer.observe(element));
}

/** Gets the headings and the promise quote ready to come in word by word. */
function prepareWordReveals() {
  // the hero headline: number the words across all three lines so they flow in order
  const heroHeadline = document.querySelector(".hero h1");
  let heroWordNumber = 0;
  heroHeadline.querySelectorAll(".line").forEach((line) => {
    heroWordNumber = splitIntoWords(line, heroWordNumber);
  });
  heroHeadline.classList.add("words", "words-in"); // the hero is on screen at once, so play straight away

  // section headings rise in when you scroll to them
  const headings = [...document.querySelectorAll("main h2")];
  headings.forEach((heading) => {
    splitIntoWords(heading);
    heading.classList.add("words");
  });

  // the promise quote "writes itself" a word at a time
  const quote = document.querySelector(".promise blockquote");
  splitIntoWords(quote);
  quote.classList.add("words", "words-stream");

  revealWhenSeen([...headings, quote]);
}

/** Changes the green word in "Pure ___." every few seconds with a soft blur swap. */
function cycleHeroWord() {
  const slot = document.querySelector(".swap-word");
  let wordIndex = 0;

  setInterval(() => {
    slot.classList.add("is-leaving"); // old word blurs up and fades
    // a timer, not "transitionend": that event never comes if the fade gets skipped
    // (slow phone, hidden tab), which would leave the word invisible for good
    setTimeout(() => {
      wordIndex = (wordIndex + 1) % HERO_WORDS.length;
      slot.textContent = HERO_WORDS[wordIndex];
      slot.classList.remove("is-leaving");
      slot.classList.add("is-entering"); // new word starts just below, blurred
      void slot.offsetWidth; // makes the browser draw the start position first
      slot.classList.remove("is-entering"); // ...then it rises into place
    }, HERO_WORD_SWAP_MS);
  }, HERO_WORD_HOLD_MS);
}

/** Counts a hero number up from zero, e.g. "600 mL" goes 0 → 600 then keeps " mL". */
function countUp(element) {
  const match = element.textContent.match(/^(\d+)(.*)$/);
  if (!match || Number(match[1]) === 0) return; // nothing to count for "0 g"
  const target = Number(match[1]);
  const unit = match[2];
  const durationMs = 1400;
  const startTime = performance.now();

  function drawFrame(now) {
    const progress = Math.min(1, (now - startTime) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3); // quick at first, gentle at the end
    element.textContent = Math.round(target * eased) + unit;
    if (progress < 1) requestAnimationFrame(drawFrame);
  }
  requestAnimationFrame(drawFrame);
}

/* ---------- Start once the page has loaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (PREFERS_LESS_MOTION) return;
  prepareWordReveals();
  cycleHeroWord();
  document.querySelectorAll(".hero-stats b").forEach(countUp);
});
