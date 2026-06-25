import { createContext, useContext, useCallback, useRef, useState } from "react";
import Dialog from "./Dialog";
import Button from "./Button";

// Konfirmasi berbasis promise (Phase 8 / Fase 2) — ganti window.confirm.
// const confirm = useConfirm(); if (await confirm({ title, description, tone:'danger' })) {...}
const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    setState({
      title: "Anda yakin?",
      confirmText: "Lanjutkan",
      cancelText: "Batal",
      tone: "danger",
      ...opts,
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        description={state?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>{state?.cancelText}</Button>
            <Button
              variant={state?.tone === "danger" ? "primary" : "primary"}
              className={state?.tone === "danger" ? "bg-danger text-white hover:bg-danger-fg" : ""}
              onClick={() => close(true)}
            >
              {state?.confirmText}
            </Button>
          </>
        }
      />
    </ConfirmCtx.Provider>
  );
}
