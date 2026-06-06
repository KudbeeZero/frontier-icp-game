import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useState } from "react";
import { createActor } from "../backend";

interface ActionConfirmState {
  showModal: boolean;
  actionName: string;
  plotId: string | null;
  amount: bigint | null;
  details: string;
  pendingFn: (() => Promise<void>) | null;
}

const INITIAL: ActionConfirmState = {
  showModal: false,
  actionName: "",
  plotId: null,
  amount: null,
  details: "",
  pendingFn: null,
};

export function useActionConfirm() {
  const { actor } = useActor(createActor);
  const [state, setState] = useState<ActionConfirmState>(INITIAL);

  const openConfirm = useCallback(
    (
      action: string,
      plotId: string | null,
      amount: bigint | null,
      details: string,
      onConfirm: () => Promise<void>,
    ) => {
      setState({
        showModal: true,
        actionName: action,
        plotId,
        amount,
        details,
        pendingFn: onConfirm,
      });
    },
    [],
  );

  const cancelAction = useCallback(() => {
    const { actionName, plotId, amount, details } = state;
    setState(INITIAL);
    // Fire-and-forget audit log — silently ignore errors
    if (actor) {
      try {
        actor
          .logCancelledAction(actionName, plotId, amount, details)
          .catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [actor, state]);

  const confirmAction = useCallback(async () => {
    const { pendingFn } = state;
    setState(INITIAL);
    if (pendingFn) {
      await pendingFn();
    }
  }, [state]);

  return {
    showModal: state.showModal,
    openConfirm,
    cancelAction,
    confirmAction,
  };
}
