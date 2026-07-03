import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

const money = new Intl.NumberFormat("ko-KR");
const DRAFTS_KEY = "hanip-settlement-drafts";

const readDrafts = () => {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function App() {
  const totalRef = useRef(null);
  const menuTableRef = useRef(null);
  const peopleCardRef = useRef(null);
  const [step, setStep] = useState(1);
  const [savingSection, setSavingSection] = useState("");
  const [name, setName] = useState("");
  const [people, setPeople] = useState([]);
  const [drafts, setDrafts] = useState(readDrafts);
  const [currentDraftId, setCurrentDraftId] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [items, setItems] = useState([
    { id: crypto.randomUUID(), menu: "", price: "", quantity: 1, members: [] },
  ]);

  const addPerson = () => {
    const value = name.trim();
    if (!value || people.includes(value)) return;
    setPeople([...people, value]);
    setName("");
  };

  const handlePersonKeyDown = (event) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.repeat)
      return;
    event.preventDefault();
    addPerson();
  };

  const saveDraft = () => {
    const now = new Date().toISOString();
    const id = currentDraftId || crypto.randomUUID();
    const draft = { id, people, items, updatedAt: now };
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

  const loadDraft = (draft) => {
    setPeople(draft.people);
    setItems(draft.items);
    setCurrentDraftId(draft.id);
    setName("");
    setStep(2);
  };

  const deleteDraft = (id) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(nextDrafts));
    setDrafts(nextDrafts);
    if (currentDraftId === id) setCurrentDraftId("");
  };

  const removePerson = (person) => {
    setPeople(people.filter((item) => item !== person));
    setItems(
      items.map((item) => ({
        ...item,
        members: item.members.filter((member) => member !== person),
      })),
    );
  };

  const updateItem = (id, patch) =>
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const toggleMember = (id, person) => {
    const item = items.find((entry) => entry.id === id);
    const members = item.members.includes(person)
      ? item.members.filter((member) => member !== person)
      : [...item.members, person];
    updateItem(id, { members });
  };

  const totals = useMemo(() => {
    const result = Object.fromEntries(people.map((person) => [person, 0]));
    items.forEach((item) => {
      if (!item.members.length) return;
      const share =
        (Number(item.price) * Number(item.quantity)) / item.members.length;
      item.members.forEach((person) => {
        result[person] += share;
      });
    });
    return result;
  }, [items, people]);

  const grandTotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const downloadSectionImage = async (
    ref,
    fileName,
    sectionName,
    backgroundColor = "#f5f4ee",
  ) => {
    if (!ref.current || savingSection) return;
    setSavingSection(sectionName);
    try {
      const target = ref.current;
      const tableWidth = target.matches?.("table")
        ? target.scrollWidth
        : target.querySelector("table")?.scrollWidth || 0;
      const captureWidth = Math.max(
        target.clientWidth,
        target.scrollWidth,
        tableWidth,
      );
      const isTotal = sectionName === "total";
      const captureHeight =
        Math.max(target.clientHeight, target.scrollHeight) + (isTotal ? 32 : 0);
      const captureStyle = {
        width: `${captureWidth}px`,
        height: `${captureHeight}px`,
        overflow: "visible",
      };
      if (isTotal) {
        Object.assign(captureStyle, {
          margin: "0",
          padding: "24px 28px",
          alignItems: "center",
          boxSizing: "border-box",
        });
      }
      const dataUrl = await toPng(target, {
        backgroundColor,
        cacheBust: true,
        pixelRatio: 2,
        width: captureWidth,
        height: captureHeight,
        style: captureStyle,
      });
      const link = document.createElement("a");
      link.download = `한입정산-${fileName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("이미지 저장에 실패했습니다.", error);
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingSection("");
    }
  };

  return (
    <main className="shell">
      <header>
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setStep(1);
          }}
        >
          <span className="logo">÷</span>
          <span>한입정산</span>
          <small className="version">v1.0.2</small>
        </a>
        <div className="steps" aria-label="진행 단계">
          <span className={step === 1 ? "active" : ""}>1. 참여자</span>
          <i />
          <span className={step === 2 ? "active" : ""}>2. 주문 내역</span>
          <i />
          <span className={step === 3 ? "active" : ""}>3. 정산 결과</span>
        </div>
      </header>

      {step === 1 && (
        <section className="page intro">
          <p className="eyebrow">STEP 01</p>
          <h1>
            누구와 함께
            <br />
            <em>먹었나요?</em>
          </h1>
          <p className="lead">
            함께한 사람들의 이름을 추가해주세요.
            <br />
            메뉴마다 누가 먹었는지 선택할 수 있어요.
          </p>
          <div className="card people-card">
            <label htmlFor="person">참여자 이름</label>
            <div className="input-row">
              <input
                id="person"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handlePersonKeyDown}
                placeholder="이름을 입력하세요"
                autoFocus
              />
              <button
                className="add"
                onClick={addPerson}
                aria-label="참여자 추가"
              >
                ＋
              </button>
            </div>
            <div className="people-list">
              {people.length === 0 && (
                <p className="empty">아직 추가된 사람이 없어요.</p>
              )}
              {people.map((person, index) => (
                <div className="person" key={person}>
                  <span className="avatar">{index + 1}</span>
                  <b>{person}</b>
                  <button
                    onClick={() => removePerson(person)}
                    aria-label={`${person} 삭제`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            className="primary"
            disabled={people.length < 2}
            onClick={() => setStep(2)}
          >
            주문 내역 입력하기 <span>→</span>
          </button>
          {people.length < 2 && (
            <small>정산하려면 2명 이상 추가해주세요.</small>
          )}
          {drafts.length > 0 && (
            <section className="drafts-section">
              <div className="drafts-heading">
                <b>임시 저장 내역</b>
                <span>{drafts.length}개</span>
              </div>
              <div className="drafts-list">
                {drafts.map((draft) => (
                  <article className="card draft-card" key={draft.id}>
                    <button
                      className="draft-load"
                      onClick={() => loadDraft(draft)}
                    >
                      <b>
                        {draft.people.slice(0, 3).join(", ")}
                        {draft.people.length > 3
                          ? ` 외 ${draft.people.length - 3}명`
                          : ""}
                      </b>
                      <span>
                        {draft.items.filter((item) => item.menu).length}개 메뉴
                        · {new Date(draft.updatedAt).toLocaleString("ko-KR")}
                      </span>
                    </button>
                    <button
                      className="draft-delete"
                      onClick={() => deleteDraft(draft.id)}
                      aria-label="임시 저장 내역 삭제"
                    >
                      삭제
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="page orders">
          <p className="eyebrow">STEP 02</p>
          <h1>
            무엇을 <em>먹었나요?</em>
          </h1>
          <div className="orders-toolbar">
            <p className="lead">
              메뉴와 금액을 적고, 함께 먹은 사람을 선택해주세요.
            </p>
            <button
              className="top-add"
              onClick={() =>
                setItems([
                  {
                    id: crypto.randomUUID(),
                    menu: "",
                    price: "",
                    quantity: 1,
                    members: [],
                  },
                  ...items,
                ])
              }
            >
              ＋ 메뉴 추가
            </button>
          </div>
          <div className="actions order-nav">
            <button className="back" onClick={() => setStep(1)}>
              ← 이전
            </button>
            <div className="order-nav-buttons">
              <button className="draft-save" onClick={saveDraft}>
                {draftSaved ? "저장 완료" : "임시 저장"}
              </button>
              <button
                className="primary"
                onClick={() => setStep(3)}
                disabled={
                  !items.some(
                    (item) => item.menu && item.price && item.members.length,
                  )
                }
              >
                정산 결과 보기 →
              </button>
            </div>
          </div>
          <div className="order-list">
            {items.map((item, index) => (
              <article className="card order-card" key={item.id}>
                <div className="order-title">
                  <span>{String(items.length - index).padStart(2, "0")}</span>
                  <h2>메뉴 정보</h2>
                  {items.length > 1 && (
                    <button
                      onClick={() =>
                        setItems(items.filter((entry) => entry.id !== item.id))
                      }
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="fields">
                  <label>
                    메뉴 이름
                    <input
                      value={item.menu}
                      onChange={(e) =>
                        updateItem(item.id, { menu: e.target.value })
                      }
                      placeholder="예: 마라탕"
                    />
                  </label>
                  <label>
                    가격
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, { price: e.target.value })
                      }
                      placeholder="0"
                    />
                    <span>원</span>
                  </label>
                  <label>
                    수량
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Math.max(1, Number(e.target.value)),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="member-select">
                  <div>
                    <b>누가 먹었나요?</b>
                    <button
                      onClick={() =>
                        updateItem(item.id, {
                          members:
                            item.members.length === people.length
                              ? []
                              : [...people],
                        })
                      }
                    >
                      {item.members.length === people.length
                        ? "전체 해제"
                        : "전체 선택"}
                    </button>
                  </div>
                  <div className="member-buttons">
                    {people.map((person) => (
                      <button
                        className={
                          item.members.includes(person) ? "selected" : ""
                        }
                        onClick={() => toggleMember(item.id, person)}
                        key={person}
                      >
                        <span>{item.members.includes(person) ? "✓" : "+"}</span>
                        {person}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="page result">
          <p className="eyebrow">STEP 03</p>
          <h1>
            깔끔하게 <em>나눴어요.</em>
          </h1>
          <div className="total" ref={totalRef}>
            <span>총 주문 금액</span>
            <strong>
              {money.format(grandTotal)}
              <small>원</small>
            </strong>
          </div>
          <button
            className="image-save-button"
            onClick={() =>
              downloadSectionImage(totalRef, "총주문금액", "total", "#22231f")
            }
            disabled={Boolean(savingSection)}
          >
            {savingSection === "total"
              ? "저장 중..."
              : "총 주문 금액 이미지 저장"}
          </button>
          <section className="menu-summary">
            <div className="section-heading">
              <div>
                <p>ORDER DETAILS</p>
                <h2>메뉴별 분배 내역</h2>
              </div>
              <span>{items.filter((item) => item.menu).length}개 메뉴</span>
            </div>
            <div className="table-scroll card">
              <table ref={menuTableRef}>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>메뉴</th>
                    <th>가격</th>
                    <th>수량</th>
                    <th>인원</th>
                    <th>분배 금액</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((item) => item.menu)
                    .reverse()
                    .map((item, index) => {
                      const share = item.members.length
                        ? Math.round(
                            (Number(item.price) * Number(item.quantity)) /
                              item.members.length,
                          )
                        : 0;
                      return (
                        <tr key={item.id}>
                          <td className="menu-number">{index + 1}</td>
                          <td>
                            <b>{item.menu}</b>
                          </td>
                          <td>₩{money.format(Number(item.price))}</td>
                          <td>{item.quantity}</td>
                          <td>{item.members.length}</td>
                          <td>
                            <strong>₩ {money.format(share)}</strong>
                          </td>
                          <td>
                            {item.members.length
                              ? item.members.join(", ")
                              : "선택된 사람 없음"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
          <button
            className="image-save-button"
            onClick={() =>
              downloadSectionImage(
                menuTableRef,
                "메뉴별분배내역",
                "menu",
                "#ffffff",
              )
            }
            disabled={Boolean(savingSection)}
          >
            {savingSection === "menu"
              ? "저장 중..."
              : "메뉴별 분배 내역 이미지 저장"}
          </button>
          <div className="people-summary">
            <div className="section-heading people-heading">
              <div>
                <p>SETTLEMENT</p>
                <h2>사람별 정산 금액</h2>
              </div>
            </div>
            <div className="card result-card" ref={peopleCardRef}>
              {people.map((person, index) => (
                <div className="result-row" key={person}>
                  <span className="avatar">{index + 1}</span>
                  <b>{person}</b>
                  <strong>{money.format(Math.round(totals[person]))}원</strong>
                </div>
              ))}
            </div>
          </div>
          <button
            className="image-save-button"
            onClick={() =>
              downloadSectionImage(
                peopleCardRef,
                "사람별정산금액",
                "people",
                "#ffffff",
              )
            }
            disabled={Boolean(savingSection)}
          >
            {savingSection === "people"
              ? "저장 중..."
              : "사람별 정산 금액 이미지 저장"}
          </button>
          <div className="actions">
            <button className="back" onClick={() => setStep(2)}>
              ← 수정하기
            </button>
            <div className="result-buttons">
              <button
                className="copy-button"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    Object.entries(totals)
                      .map(
                        ([person, total]) =>
                          `${person}: ${money.format(Math.round(total))}원`,
                      )
                      .join("\n"),
                  )
                }
              >
                결과 복사
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
