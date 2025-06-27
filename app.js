const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatLog = document.getElementById("chat-log");
const typing = document.getElementById("typing");
const sendBtn = document.getElementById("send-btn");
const themeToggle = document.getElementById("theme-toggle");
const clearBtn = document.getElementById("clear-btn");
const newChatBtn = document.getElementById("new-chat");
const historyList = document.getElementById("history-list");

let currentChatId = null;
let allChats = JSON.parse(localStorage.getItem("gemini_chats") || "{}");

function saveChats() {
  localStorage.setItem("gemini_chats", JSON.stringify(allChats));
}

function createNewChat() {
  const id = Date.now().toString();
  allChats[id] = { id, title: "New Chat", messages: [] };
  currentChatId = id;
  saveChats();
  renderSidebar();
  renderChat();
}

function renderSidebar() {
  historyList.innerHTML = "";
  Object.entries(allChats)
    .reverse()
    .forEach(([id, chat]) => {
      const div = document.createElement("div");
      div.className = "history-item";

      // Chat title span
      const title = document.createElement("span");
      title.textContent = chat.title || "Untitled Chat";
      title.style.flex = "1";
      title.style.cursor = "pointer";
      title.onclick = () => {
        currentChatId = id;
        renderChat();
      };

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️";
      delBtn.title = "Delete chat";
      delBtn.style.marginLeft = "8px";
      delBtn.style.cursor = "pointer";
      delBtn.style.border = "none";
      delBtn.style.background = "transparent";
      delBtn.style.color = "red";
      delBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent opening the chat
        delete allChats[id];
        if (currentChatId === id) {
          currentChatId = Object.keys(allChats).pop() || null;
        }
        saveChats();
        renderSidebar();
        renderChat();
      };

      // Combine
      div.style.display = "flex";
      div.style.justifyContent = "space-between";
      div.style.alignItems = "center";
      div.appendChild(title);
      div.appendChild(delBtn);
      historyList.appendChild(div);
    });
}

function renderChat() {
  chatLog.innerHTML = "";
  const chat = allChats[currentChatId];
  if (!chat) return;
  chat.messages.forEach(({ role, text }) => {
    const m = document.createElement("div");
    m.className = `message ${role}`;
    m.textContent = text;
    chatLog.appendChild(m);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendMessage(role, text) {
  const m = document.createElement("div");
  m.className = `message ${role}`;
  m.textContent = text;
  chatLog.appendChild(m);
  chatLog.scrollTop = chatLog.scrollHeight;
  if (currentChatId && allChats[currentChatId]) {
    allChats[currentChatId].messages.push({ role, text });
    if (role === "user" && allChats[currentChatId].title === "New Chat") {
      allChats[currentChatId].title = text.slice(0, 20);
    }
    saveChats();
    renderSidebar();
  }
}

async function typeMessage(role, text) {
  const m = document.createElement("div");
  m.className = `message ${role}`;
  chatLog.appendChild(m);
  chatLog.scrollTop = chatLog.scrollHeight;

  let typed = "";
  for (const ch of text) {
    typed += ch;
    m.textContent = typed;
    chatLog.scrollTop = chatLog.scrollHeight;
    await new Promise((r) => setTimeout(r, ch.match(/[.,]/) ? 50 : 20));
  }

  if (currentChatId && allChats[currentChatId]) {
    allChats[currentChatId].messages.push({ role, text });
    saveChats();
  }
}

async function fetchReply(msg) {
  const res = await fetch("https://your-vercel-app.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg }),
  });

  const data = await res.json();
  console.log("Reply data:", data);
  return data.reply;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage("user", msg);
  input.value = "";
  sendBtn.disabled = true;
  typing.classList.remove("hidden");

  try {
    const response = await fetchReply(msg);
    typing.classList.add("hidden");
    await typeMessage("assistant", response);
  } catch (err) {
    typing.classList.add("hidden");
    appendMessage("assistant", "Something went wrong.");
  } finally {
    sendBtn.disabled = false;
  }
});

input.addEventListener("input", () => {
  sendBtn.disabled = !input.value.trim();
});

clearBtn.addEventListener("click", () => {
  if (!currentChatId) return;
  allChats[currentChatId].messages = [];
  saveChats();
  renderChat();
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

newChatBtn.addEventListener("click", () => {
  createNewChat();
});

// Load last chat or create a new one
const last = Object.keys(allChats).pop();
if (last) {
  currentChatId = last;
} else {
  createNewChat();
}
renderSidebar();
renderChat();
