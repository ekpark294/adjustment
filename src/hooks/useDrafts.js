import { useState } from "react";

const DRAFTS_KEY = "hanip-settlement-drafts";

const readDrafts = () => {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const useDrafts = () => {
  const [drafts, setDrafts] = useState(readDrafts);
  const [currentDraftId, setCurrentDraftId] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  const saveDraft = (people, items) => {
    const id = currentDraftId || crypto.randomUUID();
    const draft = { id, people, items, updatedAt: new Date().toISOString() };
    const nextDrafts = [draft, ...drafts.filter((entry) => entry.id !== id)];

    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(nextDrafts));
      setDrafts(nextDrafts);
      setCurrentDraftId(id);
      setDraftSaved(true);
      window.setTimeout(() => setDraftSaved(false), 1800);
    } catch (error) {
      console.error("임시 저장에 실패했습니다.", error);
      window.alert("저장 공간이 부족해 임시 저장하지 못했습니다.");
    }
  };

  const deleteDraft = (id) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(nextDrafts));
      setDrafts(nextDrafts);
      if (currentDraftId === id) setCurrentDraftId("");
    } catch (error) {
      console.error("임시 저장 내역 삭제에 실패했습니다.", error);
      window.alert("임시 저장 내역을 삭제하지 못했습니다.");
    }
  };

  return {
    drafts,
    draftSaved,
    saveDraft,
    deleteDraft,
    selectDraft: setCurrentDraftId,
  };
};
