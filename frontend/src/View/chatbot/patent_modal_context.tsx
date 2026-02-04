import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import PatentDetailModal, { type PatentDetail } from "./patent_modal";

type PatentModalContextValue = {
  openPatentModal: (applicationNumber: string) => void;
};

const PatentModalContext = createContext<PatentModalContextValue | null>(null);

export function usePatentModal(): PatentModalContextValue {
  const ctx = useContext(PatentModalContext);
  if (!ctx) {
    throw new Error("usePatentModal must be used within PatentModalProvider");
  }
  return ctx;
}

type Props = {
  children: React.ReactNode;
};

export default function PatentModalProvider(props: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedAppNo, setSelectedAppNo] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, PatentDetail>>({});

  const openPatentModal = useCallback((applicationNumber: string) => {
    setSelectedAppNo(applicationNumber);
    setIsOpen(true);
  }, []);

  const value = useMemo<PatentModalContextValue>(
    () => ({ openPatentModal }),
    [openPatentModal]
  );

  return (
    <PatentModalContext.Provider value={value}>
      {props.children}
      <PatentDetailModal
        isOpen={isOpen}
        applicationNumber={selectedAppNo}
        cache={cache}
        onCache={(appNo: string, detail: PatentDetail) => {
          setCache((prev) => ({ ...prev, [appNo]: detail }));
        }}
        onClose={() => setIsOpen(false)}
      />
    </PatentModalContext.Provider>
  );
}

