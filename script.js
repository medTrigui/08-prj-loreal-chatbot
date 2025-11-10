/*
  script.js
  - Captures user input from a simple chat UI
  - Sends messages to OpenAI Chat Completions API using `messages`
  - Displays responses in the chat area

  Note for students:
  - Put your API key in secrets.js as a global variable, for example:
      const OPENAI_API_KEY = "sk-xxxx";
    and include <script src="secrets.js"></script> before this script in index.html.
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
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send request to OpenAI Chat Completions API using fetch and async/await
async function getChatCompletion(convMessages) {
  // We route requests through a Cloudflare Worker so the OpenAI API key stays server-side.
  // The worker URL (provided by user) will forward the request to OpenAI and return the response.
  const WORKER_URL = "https://loreal-worker.mtrigui.workers.dev/";

  const body = {
    model: "gpt-4o", // use gpt-4o by default as requested
    messages: convMessages, // provide the full conversation
    // you can add other options like max_tokens, temperature if desired
  };

  const resp = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
async function handleSend(event) {
  if (event) event.preventDefault();
  const text = userInput?.value.trim();
  if (!text) return;

  // Show user's message in UI and add to messages
  addMessage("user", text);
  messages.push({ role: "user", content: text });
  userInput.value = "";
  sendBtn.disabled = true;

  // Optionally show a "typing..." indicator
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

    // Remove typing indicator
    typingEl.remove();

    // Add assistant reply to UI and conversation
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
