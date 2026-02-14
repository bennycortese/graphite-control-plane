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

  // Persistent UI state
  const expandedBranches = new Set();
  const commitsCache = new Map();
  const pendingCommitEdits = new Map();
  let currentState = null;

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
        // Clear caches for fresh data after actions
        commitsCache.clear();
        pendingCommitEdits.clear();
        renderState(msg.payload);
        break;

      case "loading":
        setLoading(msg.payload);
        break;

      case "commits":
        if (msg.payload) {
          const { branch, commits } = msg.payload;
          commitsCache.set(branch, commits);
          pendingCommitEdits.set(
            branch,
            commits.map((c) => ({ sha: c.sha, action: "pick" }))
          );
          renderCommitsForBranch(branch);
        }
        break;
    }
  });

  function setLoading(show) {
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? "flex" : "none";
    }
  }

  function renderLocalCommits(commits) {
    // Remove existing section to prevent duplicates
    const existing = document.getElementById("localCommitsSection");
    if (existing) existing.remove();

    if (!commits || commits.length === 0) return;

    const section = document.createElement("div");
    section.id = "localCommitsSection";
    section.className = "local-commits-section";

    // Header
    const header = document.createElement("div");
    header.className = "local-commits-header";

    const title = document.createElement("span");
    title.className = "local-commits-title";
    title.textContent = "Local Commits";
    header.appendChild(title);

    const countBadge = document.createElement("span");
    countBadge.className = "local-commits-count";
    countBadge.textContent = String(commits.length);
    header.appendChild(countBadge);

    section.appendChild(header);

    // Commit list
    const list = document.createElement("div");
    list.className = "local-commits-list";

    for (const commit of commits) {
      const row = document.createElement("div");
      row.className = "local-commit-row";

      const sha = document.createElement("span");
      sha.className = "commit-sha";
      sha.textContent = commit.sha.substring(0, 7);
      row.appendChild(sha);

      const msg = document.createElement("span");
      msg.className = "commit-message";
      msg.textContent = commit.message;
      row.appendChild(msg);

      list.appendChild(row);
    }

    section.appendChild(list);

    // Add to Stack button
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary local-commits-add-btn";
    addBtn.textContent = "Add to Stack";
    addBtn.addEventListener("click", () => {
      vscode.postMessage({ type: "createBranch" });
    });
    section.appendChild(addBtn);

    // Insert before the stack list
    const mainContent = document.querySelector(".main-content-area");
    if (mainContent) {
      mainContent.insertBefore(section, mainContent.firstChild);
    }
  }

  function renderState(state) {
    setLoading(false);
    currentState = state;

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

    // Local commits section (above branch list)
    renderLocalCommits(state.localCommits || []);

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

    // Build the commit group container
    const group = document.createElement("div");
    group.className = "commit-group";

    for (const branch of state.branches) {
      const node = createBranchNode(branch);
      group.appendChild(node);
    }

    stackList.appendChild(group);
  }

  function createBranchNode(branch) {
    const li = document.createElement("div");
    li.className = "node";
    li.dataset.branch = branch.name;
    if (branch.isCurrent) li.classList.add("current");
    if (branch.isTrunk) li.classList.add("trunk");

    // Branch drag-and-drop (not for trunk)
    if (!branch.isTrunk) {
      li.draggable = true;

      li.addEventListener("dragstart", (e) => {
        if (e.target.closest && e.target.closest(".commit-row")) return;
        li.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/branch-name", branch.name);
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        clearAllDropIndicators();
      });

      li.addEventListener("dragover", (e) => {
        const branchDrag = e.dataTransfer.types.includes(
          "application/branch-name"
        );
        if (!branchDrag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        clearAllDropIndicators();
        const rect = li.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          li.classList.add("drop-above");
        } else {
          li.classList.add("drop-below");
        }
      });

      li.addEventListener("dragleave", () => {
        li.classList.remove("drop-above", "drop-below");
      });

      li.addEventListener("drop", (e) => {
        e.preventDefault();
        clearAllDropIndicators();
        const sourceBranch = e.dataTransfer.getData(
          "application/branch-name"
        );
        if (!sourceBranch || sourceBranch === branch.name) return;
        handleBranchDrop(sourceBranch, branch.name, e, li);
      });
    }

    // Commit avatar dot
    const avatar = document.createElement("div");
    avatar.className = "commit-avatar";
    li.appendChild(avatar);

    // Content area
    const content = document.createElement("div");
    content.className = "node-content";

    // Header row
    const header = document.createElement("div");
    header.className = "commit-row";

    const headerLeft = document.createElement("div");
    headerLeft.className = "nodeHeader-left";

    // Drag handle (non-trunk only)
    if (!branch.isTrunk) {
      const dragHandle = document.createElement("span");
      dragHandle.className = "branch-drag-handle";
      dragHandle.textContent = "\u2630";
      dragHandle.title = "Drag to reorder in stack";
      headerLeft.appendChild(dragHandle);
    }

    // Expand/collapse toggle (non-trunk only)
    if (!branch.isTrunk) {
      const expandToggle = document.createElement("span");
      expandToggle.className = "expand-toggle";
      expandToggle.textContent = expandedBranches.has(branch.name)
        ? "\u25BC"
        : "\u25B6";
      expandToggle.title = expandedBranches.has(branch.name)
        ? "Collapse commits"
        : "Expand commits";
      expandToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleExpand(branch);
      });
      headerLeft.appendChild(expandToggle);
    }

    // Branch name tag
    const branchTag = document.createElement("span");
    branchTag.className = "branch-tag";
    branchTag.textContent = branch.name;
    headerLeft.appendChild(branchTag);

    // "You are here" indicator
    if (branch.isCurrent) {
      const youAreHere = document.createElement("span");
      youAreHere.className = "you-are-here";
      youAreHere.textContent = "You are here";
      headerLeft.appendChild(youAreHere);
    }

    header.appendChild(headerLeft);

    // Badges container
    const badges = document.createElement("span");
    badges.className = "badges";

    if (branch.isTrunk) {
      const badge = document.createElement("span");
      badge.className = "badge trunk-badge";
      badge.textContent = "TRUNK";
      badges.appendChild(badge);
    }

    if (branch.pr) {
      const prBadge = document.createElement("span");
      prBadge.className = "pr-badge " + branch.pr.status;
      const statusLabel =
        branch.pr.status.charAt(0).toUpperCase() + branch.pr.status.slice(1);
      prBadge.textContent = "#" + branch.pr.number + " " + statusLabel;
      badges.appendChild(prBadge);
    }

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

    // Commits container (for expanded view)
    const commitsContainer = document.createElement("div");
    commitsContainer.className = "commits-container";
    commitsContainer.id = "commits-" + branch.name;
    if (!expandedBranches.has(branch.name)) {
      commitsContainer.style.display = "none";
    }
    content.appendChild(commitsContainer);

    li.appendChild(content);

    // Click to checkout non-current, non-trunk branches
    if (!branch.isCurrent && !branch.isTrunk) {
      content.style.cursor = "pointer";
      content.addEventListener("click", (e) => {
        // Don't checkout if clicking on interactive elements
        if (
          e.target.closest(".expand-toggle") ||
          e.target.closest(".commits-container") ||
          e.target.closest(".branch-drag-handle")
        ) {
          return;
        }
        vscode.postMessage({
          type: "checkout",
          payload: { branch: branch.name },
        });
      });
    }

    // If already expanded and cached, render commits
    if (expandedBranches.has(branch.name) && commitsCache.has(branch.name)) {
      renderCommitsInContainer(branch.name, commitsContainer);
    } else if (expandedBranches.has(branch.name)) {
      // Request commits
      requestCommits(branch);
    }

    return li;
  }

  function toggleExpand(branch) {
    if (expandedBranches.has(branch.name)) {
      expandedBranches.delete(branch.name);
      const container = document.getElementById("commits-" + branch.name);
      if (container) container.style.display = "none";
      // Update chevron
      const node = stackList?.querySelector(
        `[data-branch="${branch.name}"]`
      );
      const chevron = node?.querySelector(".expand-toggle");
      if (chevron) {
        chevron.textContent = "\u25B6";
        chevron.title = "Expand commits";
      }
    } else {
      expandedBranches.add(branch.name);
      const container = document.getElementById("commits-" + branch.name);
      if (container) container.style.display = "block";
      // Update chevron
      const node = stackList?.querySelector(
        `[data-branch="${branch.name}"]`
      );
      const chevron = node?.querySelector(".expand-toggle");
      if (chevron) {
        chevron.textContent = "\u25BC";
        chevron.title = "Collapse commits";
      }
      // Request commits if not cached
      if (!commitsCache.has(branch.name)) {
        requestCommits(branch);
      } else {
        renderCommitsForBranch(branch.name);
      }
    }
  }

  function requestCommits(branch) {
    const container = document.getElementById("commits-" + branch.name);
    if (container) {
      container.innerHTML =
        '<div class="commits-loading">Loading commits...</div>';
    }
    vscode.postMessage({
      type: "getCommits",
      payload: { branch: branch.name, parent: branch.parentName || "" },
    });
  }

  function renderCommitsForBranch(branchName) {
    const container = document.getElementById("commits-" + branchName);
    if (!container) return;
    renderCommitsInContainer(branchName, container);
  }

  function renderCommitsInContainer(branchName, container) {
    const commits = commitsCache.get(branchName) || [];
    const pending = pendingCommitEdits.get(branchName) || [];

    container.innerHTML = "";

    if (commits.length === 0) {
      container.innerHTML =
        '<div class="commits-empty">No commits found</div>';
      return;
    }

    const list = document.createElement("div");
    list.className = "commit-list";

    for (let i = 0; i < pending.length; i++) {
      const action = pending[i];
      const commit = commits.find((c) => c.sha === action.sha);
      const row = createCommitRow(branchName, action, commit, i);
      list.appendChild(row);
    }

    container.appendChild(list);

    // Show Apply/Reset buttons if edits differ from original
    if (hasChanges(branchName)) {
      const actions = document.createElement("div");
      actions.className = "commit-actions-bar";

      const applyBtn = document.createElement("button");
      applyBtn.className = "btn commit-apply-btn";
      applyBtn.textContent = "Apply Changes";
      applyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        applyCommitChanges(branchName);
      });

      const resetBtn = document.createElement("button");
      resetBtn.className = "btn commit-reset-btn";
      resetBtn.textContent = "Reset";
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetCommitChanges(branchName);
      });

      actions.appendChild(applyBtn);
      actions.appendChild(resetBtn);
      container.appendChild(actions);
    }
  }

  function createCommitRow(branchName, action, commit, index) {
    const row = document.createElement("div");
    row.className = "commit-row";
    row.dataset.index = index;
    row.draggable = true;

    if (action.action === "fixup") row.classList.add("action-fixup");
    if (action.action === "drop") row.classList.add("action-drop");

    // Drag handle
    const grip = document.createElement("span");
    grip.className = "commit-drag-handle";
    grip.textContent = "\u2630";
    grip.title = "Drag to reorder commit";
    row.appendChild(grip);

    // SHA badge
    const sha = document.createElement("span");
    sha.className = "commit-sha";
    sha.textContent = action.sha.substring(0, 7);
    row.appendChild(sha);

    // Message
    const msg = document.createElement("span");
    msg.className = "commit-message";
    msg.textContent = commit ? commit.message : "";
    row.appendChild(msg);

    // Action buttons
    const btns = document.createElement("span");
    btns.className = "commit-action-btns";

    // Squash (fixup) button
    const squashBtn = document.createElement("button");
    squashBtn.className = "commit-action-btn squash-btn";
    if (action.action === "fixup") squashBtn.classList.add("active");
    squashBtn.textContent = "S";
    squashBtn.title =
      action.action === "fixup"
        ? "Undo squash"
        : "Squash into previous commit";
    squashBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAction(branchName, index, "fixup");
    });
    btns.appendChild(squashBtn);

    // Drop button
    const dropBtn = document.createElement("button");
    dropBtn.className = "commit-action-btn drop-btn";
    if (action.action === "drop") dropBtn.classList.add("active");
    dropBtn.textContent = "\u00D7";
    dropBtn.title =
      action.action === "drop" ? "Undo drop" : "Drop this commit";
    dropBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAction(branchName, index, "drop");
    });
    btns.appendChild(dropBtn);

    row.appendChild(btns);

    // Commit row drag-and-drop
    row.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/commit-index", String(index));
      e.dataTransfer.setData("application/commit-branch", branchName);
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      clearAllCommitDropIndicators();
    });

    row.addEventListener("dragover", (e) => {
      const commitBranch = e.dataTransfer.types.includes(
        "application/commit-branch"
      );
      if (!commitBranch) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      clearAllCommitDropIndicators();
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        row.classList.add("commit-drop-above");
      } else {
        row.classList.add("commit-drop-below");
      }
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("commit-drop-above", "commit-drop-below");
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearAllCommitDropIndicators();
      const fromBranch = e.dataTransfer.getData(
        "application/commit-branch"
      );
      const fromIndex = parseInt(
        e.dataTransfer.getData("application/commit-index"),
        10
      );
      if (fromBranch !== branchName) return;

      const toIndex = parseInt(row.dataset.index, 10);
      if (fromIndex === toIndex) return;

      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertAt = e.clientY < midY ? toIndex : toIndex + 1;
      if (fromIndex < insertAt) insertAt--;

      reorderCommitInPending(branchName, fromIndex, insertAt);
    });

    return row;
  }

  function toggleAction(branchName, index, targetAction) {
    const pending = pendingCommitEdits.get(branchName);
    if (!pending || !pending[index]) return;

    if (pending[index].action === targetAction) {
      pending[index].action = "pick";
    } else {
      pending[index].action = targetAction;
    }

    renderCommitsForBranch(branchName);
  }

  function reorderCommitInPending(branchName, fromIndex, toIndex) {
    const pending = pendingCommitEdits.get(branchName);
    if (!pending) return;

    const [item] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, item);

    renderCommitsForBranch(branchName);
  }

  function hasChanges(branchName) {
    const commits = commitsCache.get(branchName) || [];
    const pending = pendingCommitEdits.get(branchName) || [];

    if (commits.length !== pending.length) return true;

    for (let i = 0; i < commits.length; i++) {
      if (commits[i].sha !== pending[i].sha) return true;
      if (pending[i].action !== "pick") return true;
    }
    return false;
  }

  function applyCommitChanges(branchName) {
    const pending = pendingCommitEdits.get(branchName);
    if (!pending) return;

    // Validate: cannot drop all
    const nonDrop = pending.filter((c) => c.action !== "drop");
    if (nonDrop.length === 0) {
      // Show inline error
      const container = document.getElementById("commits-" + branchName);
      if (container) {
        let errEl = container.querySelector(".commits-error");
        if (!errEl) {
          errEl = document.createElement("div");
          errEl.className = "commits-error";
          container.appendChild(errEl);
        }
        errEl.textContent = "Cannot drop all commits in a branch";
      }
      return;
    }

    // Find parent for this branch
    const branch = currentState?.branches?.find(
      (b) => b.name === branchName
    );
    const parent = branch?.parentName || "";

    vscode.postMessage({
      type: "reorderCommits",
      payload: {
        branch: branchName,
        parent: parent,
        commitActions: pending.map((p) => ({
          sha: p.sha,
          action: p.action,
        })),
      },
    });
  }

  function resetCommitChanges(branchName) {
    const commits = commitsCache.get(branchName) || [];
    pendingCommitEdits.set(
      branchName,
      commits.map((c) => ({ sha: c.sha, action: "pick" }))
    );
    renderCommitsForBranch(branchName);
  }

  function handleBranchDrop(sourceBranch, targetBranch, event, targetLi) {
    if (!currentState || !currentState.branches) return;

    // Get current order (branches are child-first, i.e. top of stack first)
    const currentOrder = currentState.branches.map((b) => b.name);

    const sourceIdx = currentOrder.indexOf(sourceBranch);
    const targetIdx = currentOrder.indexOf(targetBranch);
    if (sourceIdx === -1 || targetIdx === -1) return;

    // Remove source from current position
    const newOrder = [...currentOrder];
    newOrder.splice(sourceIdx, 1);

    // Determine insert position based on drop position
    const rect = targetLi.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    let insertIdx = currentOrder.indexOf(targetBranch);
    // Recalculate after removal
    insertIdx = newOrder.indexOf(targetBranch);
    if (event.clientY >= midY) {
      insertIdx++;
    }
    newOrder.splice(insertIdx, 0, sourceBranch);

    // The order sent to backend should be bottom-up (trunk first)
    // currentOrder is top-first (child first), so reverse
    const bottomUp = [...newOrder].reverse();

    vscode.postMessage({
      type: "reorderBranches",
      payload: { order: bottomUp },
    });
  }

  function clearAllDropIndicators() {
    document.querySelectorAll(".drop-above, .drop-below").forEach((el) => {
      el.classList.remove("drop-above", "drop-below");
    });
  }

  function clearAllCommitDropIndicators() {
    document
      .querySelectorAll(".commit-drop-above, .commit-drop-below")
      .forEach((el) => {
        el.classList.remove("commit-drop-above", "commit-drop-below");
      });
  }

  // Signal ready
  vscode.postMessage({ type: "ready" });
})();
