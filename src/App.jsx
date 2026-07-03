import { useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import OrdersStep from "./components/OrdersStep";
import ParticipantsStep from "./components/ParticipantsStep";
import ResultStep from "./components/ResultStep";
import { useDrafts } from "./hooks/useDrafts";

const createInitialItem = () => ({
  id: crypto.randomUUID(),
  menu: "",
  price: "",
  quantity: 1,
  members: [],
});

function App() {
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

  return (
    <main className="shell">
      <Header step={step} onHome={() => setStep(1)} />
      {step === 1 && (
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
      {step === 2 && (
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
      {step === 3 && (
        <ResultStep people={people} items={items} onBack={() => setStep(2)} />
      )}
      <Footer />
    </main>
  );
}

export default App;
