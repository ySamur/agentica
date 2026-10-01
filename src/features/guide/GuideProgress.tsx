import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase, type GuideProgressRow } from '../../lib/supabase';
import { nbsp } from '../../lib/typography';
import { isComplete, type Progress, type StepProgress, type StepStatus } from './progress';

type GuideProgressValue = {
  progress: Progress;
  // The member's rows have arrived; until then statuses and «Продолжить» are unknown.
  ready: boolean;
  error: string | null;
  reload: () => void;
  // Optimistic: the status shows at once and rolls back, with an Error to show, if saving fails.
  setStatus: (stepId: string, status: StepStatus) => Promise<void>;
  // Records that a step was opened: starts it, or makes it the latest opened. Finished steps stay finished.
  open: (stepId: string) => void;
};

type Loaded = { owner: string; progress: Progress; ready: boolean; error: string | null };

const empty: Progress = new Map();
const saveFailed = nbsp('Не удалось сохранить отметку. Проверьте соединение и попробуйте ещё раз.');
const GuideProgressContext = createContext<GuideProgressValue | null>(null);

const toEntry = (row: Pick<GuideProgressRow, 'status' | 'updated_at'>): StepProgress => ({ status: row.status, updatedAt: row.updated_at });

function withEntry(progress: Progress, stepId: string, entry: StepProgress | undefined) {
  const next = new Map(progress);
  if (entry) next.set(stepId, entry);
  else next.delete(stepId);
  return next;
}

// One member's route progress for the whole app: the header, the cabinet, the route and each step.
// Guests make no requests at all.
export function GuideProgressProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  // What the member sees (for handlers between renders) and what the server last confirmed.
  const shown = useRef<Progress>(empty);
  const confirmed = useRef<Progress>(empty);
  // Every change to a step takes a number; only the newest may confirm or roll back that step.
  const revisions = useRef(new Map<string, number>());

  // State left from another account (or none) never shows.
  const own = loaded?.owner === userId ? loaded : null;
  const progress = own?.progress ?? empty;
  const ready = own?.ready ?? false;
  const error = own?.error ?? null;

  useEffect(() => {
    shown.current = empty;
    confirmed.current = empty;
    revisions.current = new Map();
    const pending = getSupabase();
    if (!pending || !userId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const client = await pending;
        if (controller.signal.aborted) return;
        const { data, error: requestError, status } = await client.from('guide_progress').select('step_id, status, updated_at').abortSignal(controller.signal).retry(false);
        if (controller.signal.aborted) return;
        if (status === 401) { await signOut(); return; }
        if (requestError || !data) throw requestError;
        const rows: Progress = new Map(data.map(row => [row.step_id, toEntry(row)]));
        shown.current = rows;
        confirmed.current = rows;
        setLoaded({ owner: userId, progress: rows, ready: true, error: null });
      } catch {
        if (!controller.signal.aborted) setLoaded({ owner: userId, progress: empty, ready: false, error: nbsp('Не удалось загрузить прогресс. Проверьте соединение и попробуйте ещё раз.') });
      }
    };
    void load();
    return () => controller.abort();
  }, [userId, attempt, signOut]);

  const show = useCallback((next: Progress) => {
    shown.current = next;
    setLoaded(current => current && { ...current, progress: next });
  }, []);

  const claim = useCallback((stepId: string) => {
    const revision = (revisions.current.get(stepId) ?? 0) + 1;
    revisions.current.set(stepId, revision);
    const map = revisions.current;
    // A change made before a sign-out or reload belongs to a map that has since been replaced.
    return () => map === revisions.current && map.get(stepId) === revision;
  }, []);

  const confirm = useCallback((isNewest: () => boolean, stepId: string, entry: StepProgress | undefined) => {
    if (!isNewest()) return;
    confirmed.current = withEntry(confirmed.current, stepId, entry);
    show(withEntry(shown.current, stepId, entry));
  }, [show]);

  const rollback = useCallback((isNewest: () => boolean, stepId: string) => {
    if (isNewest()) show(withEntry(shown.current, stepId, confirmed.current.get(stepId)));
  }, [show]);

  const reload = useCallback(() => {
    setLoaded(current => current && { ...current, error: null });
    setAttempt(value => value + 1);
  }, []);

  const setStatus = useCallback(async (stepId: string, status: StepStatus) => {
    const pending = getSupabase();
    if (!pending || !userId || !ready) throw new Error(saveFailed);
    const isNewest = claim(stepId);
    show(withEntry(shown.current, stepId, { status, updatedAt: new Date().toISOString() }));
    try {
      const client = await pending;
      const { data, error: requestError, status: code } = await client.from('guide_progress')
        .upsert({ step_id: stepId, status }, { onConflict: 'user_id,step_id' })
        .select('status, updated_at').single().retry(false);
      if (code === 401) await signOut();
      if (requestError || !data) throw requestError;
      confirm(isNewest, stepId, toEntry(data));
    } catch {
      rollback(isNewest, stepId);
      throw new Error(saveFailed);
    }
  }, [userId, ready, claim, show, confirm, rollback, signOut]);

  const open = useCallback((stepId: string) => {
    const pending = getSupabase();
    if (!pending || !userId || !ready || isComplete(shown.current.get(stepId)?.status)) return;
    const isNewest = claim(stepId);
    show(withEntry(shown.current, stepId, { status: 'in_progress', updatedAt: new Date().toISOString() }));
    const record = async () => {
      try {
        const client = await pending;
        const { data, error: requestError, status } = await client.rpc('open_guide_step', { step: stepId }).retry(false);
        if (status === 401) { await signOut(); return; }
        if (requestError || !data) throw requestError;
        if (data[0]) { confirm(isNewest, stepId, toEntry(data[0])); return; }
        // Finished meanwhile on another device: the server kept its status, so take that.
        const { data: row, error: rowError } = await client.from('guide_progress').select('status, updated_at').eq('step_id', stepId).maybeSingle().retry(false);
        if (rowError) throw rowError;
        confirm(isNewest, stepId, row ? toEntry(row) : undefined);
      } catch {
        // Only the resume point is lost; the member did not ask for anything, so no message.
        rollback(isNewest, stepId);
      }
    };
    void record();
  }, [userId, ready, claim, show, confirm, rollback, signOut]);

  const value = useMemo<GuideProgressValue>(
    () => ({ progress, ready, error, reload, setStatus, open }),
    [progress, ready, error, reload, setStatus, open],
  );
  return <GuideProgressContext.Provider value={value}>{children}</GuideProgressContext.Provider>;
}

export function useGuideProgress() {
  const context = useContext(GuideProgressContext);
  if (!context) throw new Error('useGuideProgress must be used inside GuideProgressProvider');
  return context;
}
