import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import OrdersStep from "./components/OrdersStep";
import ParticipantsStep from "./components/ParticipantsStep";
import SitePage from "./components/SitePage";
import ResultStep from "./components/ResultStep";
import { useDrafts } from "./hooks/useDrafts";
import { getItemRound } from "./utils/settlement";
import {
  clearShareHash,
  decodeSettlement,
  readShareToken,
} from "./utils/shareLink";

const createInitialItem = () => ({
  id: crypto.randomUUID(),
  menu: "",
  price: "",
  quantity: 1,
  members: [],
  quantityMode: "total",
  memberQuantities: {},
  round: 1,
});

function App() {
  const [page, setPage] = useState(() => {
    const path = window.location.pathname.replace(/^\/+/, "");
    return (
      path === "guide" ||
      path === "privacy" ||
      path === "faq" ||
      path === "examples"
    )
      ? path
      : "app";
  });
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([createInitialItem()]);
  const [roundsEnabled, setRoundsEnabled] = useState(false);
  // 마지막으로 다룬 차수. 새 메뉴가 이 값을 이어받는다.
  const [activeRound, setActiveRound] = useState(1);
  // 공유 링크로 들어온 경우의 정산 내역. 내 정산과 섞이지 않도록 따로 둔다.
  // 압축 해제가 비동기라, 해석이 끝날 때까지 "loading"으로 두어 첫 화면이 잠깐 스쳐 보이지 않게 한다.
  const [shared, setShared] = useState(() =>
    readShareToken() ? "loading" : null,
  );

  /** 공유받은 내역을 내 정산으로 가져와 이어서 수정한다. */
  const continueFromShared = () => {
    setPeople(shared.people);
    setItems(shared.items);
    setRoundsEnabled(shared.roundsEnabled);
    setActiveRound(getItemRound(shared.items[0]));
    clearShareHash();
    setShared(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const leaveShared = () => {
    clearShareHash();
    setShared(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const { drafts, draftSaved, saveDraft, deleteDraft, selectDraft } =
    useDrafts();

  const loadDraft = (draft) => {
    setPeople(draft.people);
    setItems(draft.items);
    setRoundsEnabled(Boolean(draft.roundsEnabled));
    setActiveRound(getItemRound(draft.items[0]));
    selectDraft(draft.id);
    setName("");
    setStep(2);
  };

  const navigate = (nextPage) => {
    const path = nextPage === "app" ? "/" : `/${nextPage}`;
    window.history.pushState({}, "", path);
    setPage(nextPage);
    if (nextPage === "app") setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const token = readShareToken();
    if (!token) return undefined;

    let cancelled = false;
    // 해석에 실패하면 null이 되어 평소의 첫 화면을 보여준다.
    decodeSettlement(token).then((result) => {
      if (!cancelled) setShared(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, "");
      setPage(
        path === "guide" ||
          path === "privacy" ||
          path === "faq" ||
          path === "examples"
          ? path
          : "app",
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.title =
      page === "privacy"
        ? "개인정보처리방침 | 한입정산"
        : page === "guide"
          ? "사용 안내 | 한입정산"
          : page === "faq"
            ? "자주 묻는 질문 | 한입정산"
            : page === "examples"
              ? "정산 예시 | 한입정산"
          : "한입정산 | 모임 정산·더치페이 계산기";
  }, [page]);

  const isSharedLoading = page === "app" && shared === "loading";
  const isSharedView = page === "app" && Boolean(shared) && shared !== "loading";
  const isApp = page === "app" && !shared;

  return (
    <main className="shell">
      <Header
        step={isApp ? step : isSharedView ? 3 : 0}
        onHome={() => navigate("app")}
      />
      {isSharedLoading && (
        <section className="page share-loading">
          <p>공유받은 정산 내역을 불러오고 있어요.</p>
        </section>
      )}
      {isSharedView && (
        <ResultStep
          people={shared.people}
          items={shared.items}
          roundsEnabled={shared.roundsEnabled}
          sharedView
          onContinue={continueFromShared}
          onBack={leaveShared}
        />
      )}
      {page === "guide" && <SitePage type="guide" onHome={() => navigate("app")} />}
      {page === "privacy" && (
        <SitePage type="privacy" onHome={() => navigate("app")} />
      )}
      {page === "faq" && <SitePage type="faq" onHome={() => navigate("app")} />}
      {page === "examples" && (
        <SitePage type="examples" onHome={() => navigate("app")} />
      )}
      {isApp && step === 1 && (
        <ParticipantsStep
          name={name}
          setName={setName}
          people={people}
          setPeople={setPeople}
          items={items}
          setItems={setItems}
          drafts={drafts}
          onLoadDraft={loadDraft}
          onDeleteDraft={deleteDraft}
          onNext={() => setStep(2)}
        />
      )}
      {isApp && step === 2 && (
        <OrdersStep
          people={people}
          items={items}
          setItems={setItems}
          roundsEnabled={roundsEnabled}
          setRoundsEnabled={setRoundsEnabled}
          activeRound={activeRound}
          setActiveRound={setActiveRound}
          draftSaved={draftSaved}
          onSaveDraft={() => saveDraft(people, items, roundsEnabled)}
          onBack={() => setStep(1)}
          onResult={() => setStep(3)}
        />
      )}
      {isApp && step === 3 && (
        <ResultStep
          people={people}
          items={items}
          roundsEnabled={roundsEnabled}
          onBack={() => setStep(2)}
        />
      )}
      <Footer onNavigate={navigate} />
    </main>
  );
}

export default App;
