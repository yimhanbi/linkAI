import { Modal, Spin, Tabs } from "antd";
import { useEffect, useMemo, useState } from "react";
import { fetchPatents } from "@/Service/ip/patentService";

export type PatentDetail = {
  applicationNumber: string;
  titleKo?: string;
  titleEn?: string;
  applicant?: string;
  manager?: string;
  status?: string;
  abstract?: string;
  country?: string;
  publicationNumber?: string;
  registrationNumber?: string;
  ipc?: string;
  cpc?: string;
  inventors?: string;
  agent?: string;
  representativeClaim?: string;
  familyInfo?: unknown;
  docdbFamilyInfo?: unknown;
  rndInfo?: unknown;
  pdfUrl?: string;
  raw: unknown;
};

type Props = {
  isOpen: boolean;
  applicationNumber: string | null;
  cache: Record<string, PatentDetail>;
  onCache: (appNo: string, detail: PatentDetail) => void;
  onClose: () => void;
};

function pickFirstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === "string");
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

function pickFirstObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    const first = value.find((v) => Boolean(v) && typeof v === "object");
    return first && typeof first === "object" ? (first as Record<string, unknown>) : undefined;
  }
  return value as Record<string, unknown>;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts: string[] = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    const rec: Record<string, unknown> = cur as Record<string, unknown>;
    cur = rec[p];
  }
  return cur;
}

function joinStrings(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const strs: string[] = value.filter((v) => typeof v === "string") as string[];
    if (strs.length === 0) return undefined;
    return strs.join(", ");
  }
  return undefined;
}

function findStringsDeep(value: unknown, key: string, out: string[], depth: number): void {
  if (depth <= 0) return;
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) findStringsDeep(v, key, out, depth - 1);
    return;
  }
  if (typeof value !== "object") return;
  const rec: Record<string, unknown> = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    if (k === key) {
      const s = joinStrings(v) ?? pickFirstString(v);
      if (s) out.push(s);
    }
    findStringsDeep(v, key, out, depth - 1);
  }
}

function pickDeepString(doc: Record<string, unknown>, key: string): string | undefined {
  const out: string[] = [];
  findStringsDeep(doc, key, out, 6);
  return out.find((s) => typeof s === "string" && s.trim().length > 0);
}

function findFirstPdfUrl(value: unknown, depth: number = 6): string | undefined {
  if (depth <= 0 || !value) return undefined;
  if (typeof value === "string") {
    if (value.toLowerCase().endsWith(".pdf")) return value;
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = findFirstPdfUrl(v, depth - 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  const rec: Record<string, unknown> = value as Record<string, unknown>;
  for (const v of Object.values(rec)) {
    const found = findFirstPdfUrl(v, depth - 1);
    if (found) return found;
  }
  return undefined;
}

function coercePatentDetail(appNo: string, doc: Record<string, unknown>): PatentDetail {
  const titleObj: Record<string, unknown> | undefined = pickFirstObject(doc["title"]);

  const titleKo: string | undefined =
    pickFirstString(doc["title"]) ??
    pickFirstString(titleObj?.["ko"]) ??
    pickFirstString(doc["inventionTitle"]);

  const titleEn: string | undefined =
    pickFirstString(titleObj?.["en"]) ??
    pickFirstString(doc["inventionTitleEng"]) ??
    pickDeepString(doc, "inventionTitleEng");

  const abstract: string | undefined =
    pickFirstString(doc["abstract"]) ?? pickFirstString(doc["astrtCont"]);

  const applicant: string | undefined =
    pickFirstString(doc["applicant"]) ?? pickFirstString(doc["applicantName"]);

  const manager: string | undefined =
    pickFirstString(doc["responsibleInventor"]) ?? pickFirstString(doc["manager"]);

  const status: string | undefined =
    pickFirstString(doc["status"]) ?? pickFirstString(doc["finalDisposal"]);

  const country: string | undefined =
    pickFirstString(doc["country"]) ??
    pickDeepString(doc, "country") ??
    pickFirstString(getPath(doc, "biblioSummaryInfoArray.biblioSummaryInfo.country"));

  const publicationNumber: string | undefined =
    pickFirstString(doc["publicationNumber"]) ??
    pickDeepString(doc, "openNumber") ??
    pickDeepString(doc, "publicationNumber") ??
    pickFirstString(getPath(doc, "biblioSummaryInfoArray.biblioSummaryInfo.openNumber"));

  const registrationNumber: string | undefined =
    pickFirstString(doc["registrationNumber"]) ??
    pickDeepString(doc, "registerNumber") ??
    pickFirstString(getPath(doc, "biblioSummaryInfoArray.biblioSummaryInfo.registerNumber"));

  const ipc: string | undefined =
    joinStrings(doc["ipc"]) ??
    pickDeepString(doc, "ipc") ??
    joinStrings(getPath(doc, "ipcInfoArray.ipc")) ??
    joinStrings(getPath(doc, "ipcInfoArray.ipcInfo"));

  const cpc: string | undefined =
    joinStrings(doc["cpc"]) ??
    pickDeepString(doc, "cpc") ??
    joinStrings(getPath(doc, "cpcInfoArray.cpc")) ??
    joinStrings(getPath(doc, "cpcInfoArray.cpcInfo"));

  const inventors: string | undefined =
    joinStrings(doc["inventors"]) ??
    pickDeepString(doc, "inventor") ??
    pickDeepString(doc, "inventorName") ??
    pickDeepString(doc, "name");

  const agent: string | undefined =
    pickFirstString(doc["agent"]) ??
    pickDeepString(doc, "agentName") ??
    pickDeepString(doc, "agent");

  const representativeClaim: string | undefined =
    pickFirstString(doc["representativeClaim"]) ??
    pickDeepString(doc, "representativeClaim") ??
    pickDeepString(doc, "mainClaim") ??
    pickDeepString(doc, "claim");

  const familyInfo: unknown =
    getPath(doc, "familyInfoArray") ?? getPath(doc, "docFamilyInfoArray");

  const docdbFamilyInfo: unknown = getPath(doc, "docdbFamilyInfoArray");

  const rndInfo: unknown = getPath(doc, "rndInfoArray");

  const pdfUrl: string | undefined =
    pickFirstString(getPath(doc, "imagePathInfo.pdfUrl")) ??
    pickFirstString(getPath(doc, "imagePathInfo.fullPdfUrl")) ??
    findFirstPdfUrl(getPath(doc, "imagePathInfo")) ??
    findFirstPdfUrl(doc);

  return {
    applicationNumber: appNo,
    titleKo,
    titleEn,
    applicant,
    manager,
    status,
    abstract,
    country,
    publicationNumber,
    registrationNumber,
    ipc,
    cpc,
    inventors,
    agent,
    representativeClaim,
    familyInfo,
    docdbFamilyInfo,
    rndInfo,
    pdfUrl,
    raw: doc,
  };
}

export default function PatentDetailModal(props: Props) {
  const appNo: string | null = props.applicationNumber;
  const cached: PatentDetail | undefined = appNo ? props.cache[appNo] : undefined;
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [detail, setDetail] = useState<PatentDetail | null>(null);

  useEffect(() => {
    if (!props.isOpen) return;
    if (!appNo) return;

    if (cached) {
      setDetail(cached);
      setStatus("success");
      setErrorMessage("");
      return;
    }

    let didCancel: boolean = false;
    const run = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const response = await fetchPatents({ app_num: appNo, limit: 1, page: 1 });
        const first: unknown = Array.isArray(response.data) ? response.data[0] : undefined;
        if (!first || typeof first !== "object") {
          throw new Error("특허 정보를 찾을 수 없습니다.");
        }
        const doc = first as Record<string, unknown>;
        const result: PatentDetail = coercePatentDetail(appNo, doc);
        if (didCancel) return;
        props.onCache(appNo, result);
        setDetail(result);
        setStatus("success");
      } catch (err) {
        if (didCancel) return;
        const msg: string =
          err instanceof Error ? err.message : "특허 정보를 불러오지 못했습니다.";
        setErrorMessage(msg);
        setStatus("error");
      }
    };
    void run();

    return () => {
      didCancel = true;
    };
  }, [props.isOpen, appNo, cached, props]);

  const modalTitle = useMemo(() => {
    const titleKo: string =
      detail?.titleKo ?? (appNo ? `특허 정보 (${appNo})` : "특허 정보");
    const titleEn: string | undefined = detail?.titleEn;

    return (
      <div>
        <div>{titleKo}</div>
        {titleEn ? (
          <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4 }}>
            {titleEn}
          </div>
        ) : null}
      </div>
    );
  }, [appNo, detail]);

  return (
    <Modal
      open={props.isOpen}
      title={modalTitle}
      onCancel={props.onClose}
      footer={null}
      width={980}
      zIndex={3001}
      destroyOnClose
    >
      {!appNo ? null : status === "loading" ? (
        <div style={{ padding: 20, display: "flex", justifyContent: "center" }}>
          <Spin />
        </div>
      ) : status === "error" ? (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 8 }}>{errorMessage}</div>
          <button type="button" onClick={props.onClose}>
            닫기
          </button>
        </div>
      ) : detail ? (
        <Tabs
          items={[
            {
              key: "info",
              label: "특허정보",
              children: (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr 160px 1fr",
                      gap: 0,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                      책임연구자
                    </div>
                    <div style={{ padding: 10 }}>{detail.manager ?? "-"}</div>
                    <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                      소속(출원인)
                    </div>
                    <div style={{ padding: 10 }}>{detail.applicant ?? "-"}</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr 160px 1fr",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        국가
                      </div>
                      <div style={{ padding: 10 }}>{detail.country ?? "-"}</div>
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        행정상태
                      </div>
                      <div style={{ padding: 10 }}>{detail.status ?? "-"}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr" }}>
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        출원번호
                      </div>
                      <div style={{ padding: 10 }}>{detail.applicationNumber}</div>
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        공개번호
                      </div>
                      <div style={{ padding: 10 }}>{detail.publicationNumber ?? "-"}</div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr 160px 1fr",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        등록번호
                      </div>
                      <div style={{ padding: 10 }}>{detail.registrationNumber ?? "-"}</div>
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        IPC / CPC
                      </div>
                      <div style={{ padding: 10 }}>
                        {detail.ipc ?? "-"}
                        {detail.cpc ? <div style={{ marginTop: 6 }}>{detail.cpc}</div> : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        발명자
                      </div>
                      <div style={{ padding: 10 }}>{detail.inventors ?? "-"}</div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        대리인
                      </div>
                      <div style={{ padding: 10 }}>{detail.agent ?? "-"}</div>
                    </div>
                  </div>

                  {detail.abstract ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        요약
                      </div>
                      <div style={{ padding: 10, whiteSpace: "pre-wrap" }}>{detail.abstract}</div>
                    </div>
                  ) : null}

                  {detail.representativeClaim ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        대표청구항
                      </div>
                      <div style={{ padding: 10, whiteSpace: "pre-wrap" }}>
                        {detail.representativeClaim}
                      </div>
                    </div>
                  ) : null}

                  {/* 패밀리 정보 */}
                  {detail.familyInfo ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        패밀리 정보
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          overflow: "auto",
                          maxHeight: 180,
                          background: "var(--bg)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {JSON.stringify(detail.familyInfo, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {/* DOCDB 패밀리 */}
                  {detail.docdbFamilyInfo ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        DOCDB 패밀리
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          overflow: "auto",
                          maxHeight: 180,
                          background: "var(--bg)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {JSON.stringify(detail.docdbFamilyInfo, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {/* 국가연구개발사업 정보 */}
                  {detail.rndInfo ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, background: "var(--bg-sub)", fontWeight: 700 }}>
                        국가연구개발사업
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          overflow: "auto",
                          maxHeight: 180,
                          background: "var(--bg)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {JSON.stringify(detail.rndInfo, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {/* 특허공보 PDF 링크 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // 실제 PDF 연동 전까지는 안내 메시지만 표시
                        // eslint-disable-next-line no-alert
                        alert("특허공보 PDF 연동은 구현 예정 중입니다.");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: "var(--border)",
                        color: "var(--text-sub)",
                        fontWeight: 600,
                      }}
                    >
                      특허공보 (PDF)
                    </button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </Modal>
  );
}

