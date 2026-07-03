const createItem = () => ({
  id: crypto.randomUUID(),
  menu: "",
  price: "",
  quantity: 1,
  members: [],
});

function OrdersStep({
  people,
  items,
  setItems,
  draftSaved,
  onSaveDraft,
  onBack,
  onResult,
}) {
  const updateItem = (id, patch) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const toggleMember = (id, person) => {
    const item = items.find((entry) => entry.id === id);
    const members = item.members.includes(person)
      ? item.members.filter((member) => member !== person)
      : [...item.members, person];
    updateItem(id, { members });
  };

  return (
    <section className="page orders">
      <p className="eyebrow">STEP 02</p>
      <h1>
        무엇을 <em>먹었나요?</em>
      </h1>
      <div className="orders-toolbar">
        <p className="lead">메뉴와 금액을 적고, 함께 먹은 사람을 선택해주세요.</p>
        <button className="top-add" onClick={() => setItems([createItem(), ...items])}>
          ＋ 메뉴 추가
        </button>
      </div>
      <div className="actions order-nav">
        <button className="back" onClick={onBack}>← 이전</button>
        <div className="order-nav-buttons">
          <button className="draft-save" onClick={onSaveDraft}>
            {draftSaved ? "저장 완료" : "임시 저장"}
          </button>
          <button
            className="primary"
            onClick={onResult}
            disabled={!items.some((item) => item.menu && item.price && item.members.length)}
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
                <button onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>
                  삭제
                </button>
              )}
            </div>
            <div className="fields">
              <label>
                메뉴 이름
                <input value={item.menu} onChange={(event) => updateItem(item.id, { menu: event.target.value })} placeholder="예: 마라탕" />
              </label>
              <label>
                가격
                <input type="number" min="0" value={item.price} onChange={(event) => updateItem(item.id, { price: event.target.value })} placeholder="0" />
                <span>원</span>
              </label>
              <label>
                수량
                <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value)) })} />
              </label>
            </div>
            <div className="member-select">
              <div>
                <b>누가 먹었나요?</b>
                <button onClick={() => updateItem(item.id, { members: item.members.length === people.length ? [] : [...people] })}>
                  {item.members.length === people.length ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              <div className="member-buttons">
                {people.map((person) => (
                  <button className={item.members.includes(person) ? "selected" : ""} onClick={() => toggleMember(item.id, person)} key={person}>
                    <span>{item.members.includes(person) ? "✓" : "+"}</span>{person}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OrdersStep;
