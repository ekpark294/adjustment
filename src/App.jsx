import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import OrdersStep from "./components/OrdersStep";
import ParticipantsStep from "./components/ParticipantsStep";
import SitePage from "./components/SitePage";
import ResultStep from "./components/ResultStep";
import { useDrafts } from "./hooks/useDrafts";

const createInitialItem = () => ({
  id: crypto.randomUUID(),
  menu: "",
  price: "",
  quantity: 1,
  members: [],
  quantityMode: "total",
  memberQuantities: {},
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
  const { drafts, draftSaved, saveDraft, deleteDraft, selectDraft } =
    useDrafts();

  const loadDraft = (draft) => {
    setPeople(draft.people);
    setItems(draft.items);
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

  return (
    <main className="shell">
      <Header step={page === "app" ? step : 0} onHome={() => navigate("app")} />
      {page === "guide" && <SitePage type="guide" onHome={() => navigate("app")} />}
      {page === "privacy" && (
        <SitePage type="privacy" onHome={() => navigate("app")} />
      )}
      {page === "faq" && <SitePage type="faq" onHome={() => navigate("app")} />}
      {page === "examples" && (
        <SitePage type="examples" onHome={() => navigate("app")} />
      )}
      {page === "app" && step === 1 && (
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
      {page === "app" && step === 2 && (
        <OrdersStep
          people={people}
          items={items}
          setItems={setItems}
          draftSaved={draftSaved}
          onSaveDraft={() => saveDraft(people, items)}
          onBack={() => setStep(1)}
          onResult={() => setStep(3)}
        />
      )}
      {page === "app" && step === 3 && (
        <ResultStep people={people} items={items} onBack={() => setStep(2)} />
      )}
      <Footer onNavigate={navigate} />
    </main>
  );
}

export default App;
