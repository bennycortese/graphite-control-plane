import { useVSCodeState } from "./hooks/useVSCodeState";
import { AccentStripe } from "./components/AccentStripe";
import { TopBar } from "./components/TopBar";
import { ErrorBanner } from "./components/ErrorBanner";
import { MetaSection } from "./components/MetaSection";
import { LocalCommitsSection } from "./components/LocalCommitsSection";
import { BranchList } from "./components/BranchList";
import { LoadingOverlay } from "./components/LoadingOverlay";

export function App() {
  const {
    state,
    loading,
    expandedBranches,
    commitsCache,
    pendingEdits,
    refresh,
    sync,
    submitStack,
    restack,
    checkout,
    createBranch,
    reorderBranches,
    toggleExpand,
    toggleCommitAction,
    reorderCommitInPending,
    hasChanges,
    applyCommitChanges,
    resetCommitChanges,
  } = useVSCodeState();

  return (
    <>
      <AccentStripe />

      <TopBar
        onSync={sync}
        onSubmit={submitStack}
        onRestack={restack}
        onRefresh={refresh}
      />

      <ErrorBanner error={state?.error} />

      {state && (
        <>
          <div style={{ height: 0, margin: 0 }} />

          <MetaSection
            trunk={state.trunk}
            currentBranch={state.currentBranch}
          />

          <main>
            <LocalCommitsSection
              commits={state.localCommits || []}
              onCreateBranch={createBranch}
            />

            <BranchList
              branches={state.branches}
              expandedBranches={expandedBranches}
              commitsCache={commitsCache}
              pendingEdits={pendingEdits}
              onCheckout={checkout}
              onToggleExpand={toggleExpand}
              onToggleAction={toggleCommitAction}
              onReorderCommit={reorderCommitInPending}
              onApplyCommits={applyCommitChanges}
              onResetCommits={resetCommitChanges}
              onReorderBranches={reorderBranches}
              hasChanges={hasChanges}
            />
          </main>
        </>
      )}

      <LoadingOverlay visible={loading} />
    </>
  );
}
