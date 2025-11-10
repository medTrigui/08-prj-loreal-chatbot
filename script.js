/*
  script.js
  - Lightweight chat client for the L'Oréal demo.
    - Captures user input and renders messages as chat bubbles.
    - Routes requests through a Cloudflare Worker (so the API key stays server-side).
    - Keeps a simple messages array and displays assistant responses.

  Final-touch comments and small polish added below for clarity.
*/

// Get references to DOM elements (match IDs used in `index.html`)
const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const sendBtn = document.querySelector("#sendBtn");
const chatContainer = document.querySelector("#chatWindow");

// Keep the conversation messages so the model has context
let messages = [
  // System instruction: restrict answers to L'Oréal / beauty topics and politely refuse others
  {
    role: "system",
    content:
      "You are a helpful assistant specialized in L’Oréal products, skincare and beauty routines, and related recommendations. Politely refuse to answer questions that are unrelated to L’Oréal products, beauty, skincare, cosmetics, haircare, or routine recommendations. When refusing, respond briefly and offer to help with L’Oréal-specific or beauty-related questions instead.",
  },
];

// Try common global names for the API key (secrets.js should set one of these)
const apiKey =
  window.OPENAI_API_KEY || window.API_KEY || window.OPENAI_KEY || "";

// Helper to append messages to the chat container
// role: 'user' or 'assistant' (we also accept 'ai' as the assistant class)
function addMessage(role, text) {
  // role expected to be 'user' or 'assistant'
  const msgEl = document.createElement("div");
  // Add classes compatible with the project's CSS: .chat-message and .msg plus role-specific class
  msgEl.classList.add("chat-message", "msg");
  if (role === "user") {
    msgEl.classList.add("user");
  } else {
    msgEl.classList.add("ai");
  }

  // Create a bold label (User: / Assistant:) and a content span
  const labelSpan = document.createElement("span");
  labelSpan.classList.add("msg-label");
  labelSpan.innerText = role === "user" ? "User: " : "Assistant: ";

  const contentSpan = document.createElement("span");
  contentSpan.classList.add("msg-text");
  contentSpan.innerText = text;

  msgEl.appendChild(labelSpan);
  msgEl.appendChild(contentSpan);

  if (!chatContainer) return; // defensive
  chatContainer.appendChild(msgEl);
  // Smoothly scroll newest message into view
  chatContainer.scrollTop = chatContainer.scrollHeight;
  // add a transient 'new' class for a subtle appear animation, then remove it
  msgEl.classList.add('new');
  setTimeout(() => msgEl.classList.remove('new'), 260);
}

// Send request to OpenAI Chat Completions API using fetch and async/await
// NOTE: This client posts to a Cloudflare Worker URL which must forward
// the request to OpenAI using the server-side key.
async function getChatCompletion(convMessages) {
  const WORKER_URL = "https://loreal-worker.mtrigui.workers.dev/";
  // Log the worker endpoint (helpful during local dev)
  console.info("POSTing chat completion request to worker:", WORKER_URL);

  const body = {
    model: "gpt-4o",
    messages: convMessages,
  };

  const resp = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API request failed: ${resp.status} ${errText}`);
  }

  const data = await resp.json();

  // For Chat Completions the assistant content is at data.choices[0].message.content
  const assistantContent = data?.choices?.[0]?.message?.content;
  if (!assistantContent) {
    throw new Error("No assistant message found in API response.");
  }

  return assistantContent;
}

// Handle form submit / send button
// - Prevents default submit behavior
// - Renders user's message immediately and shows a typing indicator
// - Sends messages array to the worker and renders assistant reply
async function handleSend(event) {
  if (event) event.preventDefault();
  const text = userInput?.value.trim();
  if (!text) return;

  // Show user's message in UI and add to messages (messages array is used for context)
  addMessage("user", text);
  messages.push({ role: "user", content: text });
  userInput.value = "";
  sendBtn.disabled = true;

  // Optionally show a "typing..." indicator to improve UX
  const typingEl = document.createElement("div");
  typingEl.classList.add("chat-message", "msg", "ai", "typing");
  const typingLabel = document.createElement("span");
  typingLabel.classList.add("msg-label");
  typingLabel.innerText = "Assistant: ";
  const typingContent = document.createElement("span");
  typingContent.classList.add("msg-text");
  typingContent.innerText = "...";
  typingEl.appendChild(typingLabel);
  typingEl.appendChild(typingContent);
  chatContainer.appendChild(typingEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const reply = await getChatCompletion(messages);

  // Remove typing indicator and render assistant reply
  typingEl.remove();
  addMessage("assistant", reply);
  messages.push({ role: "assistant", content: reply });
  } catch (err) {
    // Remove typing indicator and show error
    typingEl.remove();
    addMessage("assistant", `Error: ${err.message}`);
    console.error(err);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// Event listeners
if (chatForm) {
  chatForm.addEventListener("submit", handleSend);
} else if (sendBtn) {
  sendBtn.addEventListener("click", handleSend);
}

// Allow pressing Enter in the input to send (without shift/ctrl)
if (userInput) {
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}
