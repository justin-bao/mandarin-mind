const input = document.querySelector("#input");
const analyzeButton = document.querySelector("#analyze");
const copyButton = document.querySelector("#copy");
const result = document.querySelector("#result");
const issues = document.querySelector("#issues");

let latestCorrection = "";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function renderAnalysis(analysis) {
  latestCorrection = analysis.correctedText || "";
  result.classList.remove("muted");
  result.innerHTML = `
    <div class="corrected">${escapeHtml(analysis.correctedText || "")}</div>
    <div class="pinyin">${escapeHtml(analysis.pinyin || "")}</div>
    <div class="translation">${escapeHtml(analysis.translation || "")}</div>
    <div class="tone">
      <strong>${escapeHtml(analysis.tone?.label || "tone")}</strong>
      ${escapeHtml(analysis.tone?.summary || "")}
      <span>${Number(analysis.tone?.authenticityScore || 0)}/100</span>
    </div>
  `;

  issues.innerHTML = "";
  for (const issue of analysis.issues || []) {
    const node = document.createElement("article");
    node.className = `issue ${issue.severity || "suggestion"}`;
    const replacement = issue.replacement ? `<span class="replacement">${escapeHtml(issue.replacement)}</span>` : "";
    node.innerHTML = `
      <div class="issue-top">
        <strong>${escapeHtml(issue.rangeText || issue.type || "Issue")}</strong>
        ${replacement}
      </div>
      <p>${escapeHtml(issue.message || "")}</p>
    `;
    issues.appendChild(node);
  }
}

analyzeButton.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) {
    result.textContent = "Type something first.";
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Checking...";

  try {
    const config = await window.mandarinMind.getConfig();
    const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/api/keyboard/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {})
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    renderAnalysis(await response.json());
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "Could not analyze text.";
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze";
  }
});

copyButton.addEventListener("click", async () => {
  if (!latestCorrection) return;
  await window.mandarinMind.copyText(latestCorrection);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy Correction";
  }, 1200);
});
