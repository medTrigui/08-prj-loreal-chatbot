/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Logo fallback handler: if the white logo fails to load, reveal the typographic fallback
document.addEventListener("DOMContentLoaded", () => {
  const logoImg = document.querySelector(".logo-badge img.brand-logo");
  const fallback = document.querySelector(".logo-fallback");
  if (!logoImg) return;

  // show fallback if image fails to load
  logoImg.addEventListener("error", () => {
    if (fallback) fallback.classList.add("show");
    logoImg.style.opacity = "0";
  });

  // ensure fallback hidden when image loads fine
  logoImg.addEventListener("load", () => {
    if (fallback) fallback.classList.remove("show");
    logoImg.style.opacity = "1";
  });
});

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // When using Cloudflare, you'll need to POST a `messages` array in the body,
  // and handle the response using: data.choices[0].message.content

  // Show message
  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
