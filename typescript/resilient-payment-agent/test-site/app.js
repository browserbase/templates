/* global document, console, window, FormData */

const form = document.querySelector("#payment-form");
const captchaStatus = document.querySelector("#captcha-status");
const submitButton = document.querySelector("#submit-payment");
const confirmation = document.querySelector("#confirmation");

let captchaSolved = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function createConfirmationId(invoiceNumber) {
  const normalizedInvoice = invoiceNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const invoicePart = normalizedInvoice.slice(-8).padStart(8, "0");
  const timePart = Date.now().toString().slice(-6);
  return `SBX-${invoicePart}-${timePart}`;
}

function simulateCaptcha() {
  console.log("browserbase-solving-started");
  captchaStatus.textContent = "Security challenge in progress...";
  submitButton.disabled = true;

  window.setTimeout(() => {
    captchaSolved = true;
    console.log("browserbase-solving-finished");
    captchaStatus.textContent = "Security check complete. You can submit now.";
    captchaStatus.classList.add("ready");
    submitButton.disabled = false;
  }, 2200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!captchaSolved) {
    captchaStatus.textContent = "Please wait for the security check to finish.";
    return;
  }

  const formData = new FormData(form);
  const invoiceNumber = String(formData.get("invoice_number") ?? "NO-INVOICE");
  const paymentAmount = String(formData.get("payment_amount") ?? "0");
  const cardNumber = String(formData.get("card_number") ?? "");
  const cardLastFour = cardNumber.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const confirmationId = createConfirmationId(invoiceNumber);
  const chargedAmount = formatCurrency(paymentAmount);

  confirmation.innerHTML = `
    <h3>Payment approved</h3>
    <p class="meta-line"><span>Status</span><strong>Approved (sandbox)</strong></p>
    <p class="meta-line"><span>Confirmation ID</span><strong>${escapeHtml(confirmationId)}</strong></p>
    <p class="meta-line"><span>Charged amount</span><strong>${escapeHtml(chargedAmount)}</strong></p>
    <p class="meta-line"><span>Card used</span><strong>**** **** **** ${escapeHtml(cardLastFour)}</strong></p>
  `;
  confirmation.classList.add("visible");
  confirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

simulateCaptcha();
