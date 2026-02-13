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
    setLoading(false);

    // Error banner
    if (state.error) {
      if (errorBanner) errorBanner.style.display = "flex";
      if (errorText) errorText.textContent = state.error;
    } else {
      if (errorBanner) errorBanner.style.display = "none";
    }

    // Meta
    if (trunkName) trunkName.textContent = state.trunk || "\u2014";
    if (currentName) currentName.textContent = state.currentBranch || "\u2014";

    // Branch list
    if (!stackList) return;
    stackList.innerHTML = "";

    if (!state.branches || state.branches.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = state.error
        ? "Unable to load branches"
        : "No branches found";
      stackList.appendChild(li);
      return;
    }

    // Build the commit group container (ISL-style)
    const group = document.createElement("div");
    group.className = "commit-group";

    for (const branch of state.branches) {
      const row = document.createElement("div");
      row.className = "node";
      if (branch.isCurrent) row.classList.add("current");
      if (branch.isTrunk) row.classList.add("trunk");

      // Commit avatar dot (positioned absolute in the branch line)
      const avatar = document.createElement("div");
      avatar.className = "commit-avatar";
      row.appendChild(avatar);

      // Content area
      const content = document.createElement("div");
      content.className = "node-content";

      // First row: commit title + date
      const firstRow = document.createElement("div");
      firstRow.className = "commit-row";

      // Branch name as monospace tag
      const branchTag = document.createElement("span");
      branchTag.className = "branch-tag";
      branchTag.textContent = branch.name;
      firstRow.appendChild(branchTag);

      // "You are here" indicator for current branch
      if (branch.isCurrent) {
        const youAreHere = document.createElement("span");
        youAreHere.className = "you-are-here";
        youAreHere.textContent = "You are here";
        firstRow.appendChild(youAreHere);
      }

      // Time ago
      if (branch.timeAgo) {
        const date = document.createElement("span");
        date.className = "commit-date";
        date.textContent = branch.timeAgo;
        firstRow.appendChild(date);
      }

      content.appendChild(firstRow);

      // Second row: commit message + PR badge + review badge
      const secondRow = document.createElement("div");
      secondRow.className = "commit-second-row";

      if (branch.commitMessage) {
        const title = document.createElement("span");
        title.className = "commit-title";
        title.textContent = branch.commitMessage;
        secondRow.appendChild(title);
      }

      // Short hash
      if (branch.commitSha) {
        const hash = document.createElement("span");
        hash.className = "commit-hash";
        hash.textContent = branch.commitSha.substring(0, 7);
        secondRow.appendChild(hash);
      }

      // PR badge (GitHub-style solid colors)
      if (branch.pr) {
        const prBadge = document.createElement("span");
        prBadge.className = "pr-badge " + branch.pr.status;
        prBadge.textContent = "#" + branch.pr.number;
        secondRow.appendChild(prBadge);
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
        reviewBadge.textContent =
          reviewLabels[branch.pr.reviewStatus] || branch.pr.reviewStatus;
        secondRow.appendChild(reviewBadge);
      }

      content.appendChild(secondRow);
      row.appendChild(content);

      // Show-on-hover action buttons (ISL-style progressive disclosure)
      if (!branch.isTrunk) {
        const actions = document.createElement("div");
        actions.className = "node-actions";

        if (!branch.isCurrent) {
          const gotoBtn = document.createElement("button");
          gotoBtn.className = "node-action-btn";
          gotoBtn.textContent = "Goto";
          gotoBtn.title = "Checkout this branch";
          gotoBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            vscode.postMessage({
              type: "checkout",
              payload: { branch: branch.name },
            });
          });
          actions.appendChild(gotoBtn);
        }

        row.appendChild(actions);
      }

      // Click anywhere on non-current, non-trunk rows to checkout
      if (!branch.isCurrent && !branch.isTrunk) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
          vscode.postMessage({
            type: "checkout",
            payload: { branch: branch.name },
          });
        });
      }

      group.appendChild(row);
    }

    stackList.appendChild(group);
  }

  // Signal ready
  vscode.postMessage({ type: "ready" });
})();
