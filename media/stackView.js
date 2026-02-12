(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const refreshBtn = document.getElementById("refreshBtn");
  const syncBtn = document.getElementById("syncBtn");
  const submitBtn = document.getElementById("submitBtn");
  const restackBtn = document.getElementById("restackBtn");
  const stackList = document.getElementById("stackList");
  const trunkName = document.getElementById("trunkName");
  const currentName = document.getElementById("currentName");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const errorBanner = document.getElementById("errorBanner");
  const errorText = document.getElementById("errorText");

  refreshBtn?.addEventListener("click", () => {
    vscode.postMessage({ type: "refresh" });
  });

  syncBtn?.addEventListener("click", () => {
    vscode.postMessage({ type: "sync" });
  });

  submitBtn?.addEventListener("click", () => {
    vscode.postMessage({ type: "submitStack" });
  });

  restackBtn?.addEventListener("click", () => {
    vscode.postMessage({ type: "restack" });
  });

  window.addEventListener("message", (event) => {
    const msg = event.data;

    switch (msg.type) {
      case "state":
        renderState(msg.payload);
        break;

      case "loading":
        setLoading(msg.payload);
        break;
    }
  });

  function setLoading(show) {
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? "flex" : "none";
    }
  }

  function renderState(state) {
    // Hide loading
    setLoading(false);

    // Error banner
    if (state.error) {
      if (errorBanner) errorBanner.style.display = "block";
      if (errorText) errorText.textContent = state.error;
    } else {
      if (errorBanner) errorBanner.style.display = "none";
    }

    // Meta
    if (trunkName) trunkName.textContent = state.trunk || "—";
    if (currentName) currentName.textContent = state.currentBranch || "—";

    // Branch list
    if (!stackList) return;
    stackList.innerHTML = "";

    if (!state.branches || state.branches.length === 0) {
      const li = document.createElement("li");
      li.className = "node empty-state";
      li.textContent = state.error
        ? "Unable to load branches"
        : "No branches found";
      stackList.appendChild(li);
      return;
    }

    for (const branch of state.branches) {
      const li = document.createElement("li");
      li.className = "node";
      if (branch.isCurrent) li.classList.add("current");
      if (branch.isTrunk) li.classList.add("trunk");

      // Rail column (dot + connecting line via CSS)
      const rail = document.createElement("div");
      rail.className = "rail";
      li.appendChild(rail);

      // Content column
      const content = document.createElement("div");
      content.className = "node-content";

      // Header row: name + badges
      const header = document.createElement("div");
      header.className = "nodeHeader";

      const title = document.createElement("span");
      title.className = "nodeTitle";
      title.textContent = branch.name;
      header.appendChild(title);

      const badges = document.createElement("span");
      badges.className = "badges";

      if (branch.isCurrent) {
        const badge = document.createElement("span");
        badge.className = "badge current-badge";
        badge.textContent = "CURRENT";
        badges.appendChild(badge);
      }

      if (branch.isTrunk) {
        const badge = document.createElement("span");
        badge.className = "badge trunk-badge";
        badge.textContent = "TRUNK";
        badges.appendChild(badge);
      }

      // PR badge
      if (branch.pr) {
        const prBadge = document.createElement("span");
        prBadge.className = "pr-badge " + branch.pr.status;
        const statusLabel = branch.pr.status.charAt(0).toUpperCase() + branch.pr.status.slice(1);
        prBadge.textContent = "#" + branch.pr.number + " " + statusLabel;
        badges.appendChild(prBadge);
      }

      // Review status badge
      if (branch.pr && branch.pr.reviewStatus) {
        const reviewBadge = document.createElement("span");
        const reviewClass = branch.pr.reviewStatus.replace(/_/g, "-");
        reviewBadge.className = "review-badge " + reviewClass;
        const reviewLabels = {
          approved: "Approved",
          changes_requested: "Changes Requested",
          review_required: "Review Required",
        };
        reviewBadge.textContent = reviewLabels[branch.pr.reviewStatus] || branch.pr.reviewStatus;
        badges.appendChild(reviewBadge);
      }

      header.appendChild(badges);
      content.appendChild(header);

      // Sub info: commit + time
      if (branch.commitMessage || branch.timeAgo) {
        const sub = document.createElement("div");
        sub.className = "sub";

        const parts = [];
        if (branch.commitSha) {
          parts.push(branch.commitSha.substring(0, 7));
        }
        if (branch.commitMessage) {
          parts.push(branch.commitMessage);
        }
        if (branch.timeAgo) {
          parts.push(branch.timeAgo);
        }

        sub.textContent = parts.join(" \u2022 ");
        content.appendChild(sub);
      }

      li.appendChild(content);

      // Click to checkout non-current branches
      if (!branch.isCurrent && !branch.isTrunk) {
        content.style.cursor = "pointer";
        content.addEventListener("click", () => {
          vscode.postMessage({
            type: "checkout",
            payload: { branch: branch.name },
          });
        });
      }

      stackList.appendChild(li);
    }
  }

  // Signal ready
  vscode.postMessage({ type: "ready" });
})();
