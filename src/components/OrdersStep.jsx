import {
  getItemParticipants,
  getItemTotalQuantity,
  isIndividualQuantityItem,
  parseCount,
} from "../utils/settlement";

const createItem = () => ({
  id: crypto.randomUUID(),
  menu: "",
  price: "",
  quantity: 1,
  members: [],
  quantityMode: "total",
  memberQuantities: {},
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

  const normalizeCountInput = (value) => value.replace(/\D/g, "");

  const normalizeDecimalCountInput = (value) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const [whole, ...decimalParts] = sanitized.split(".");

    if (!decimalParts.length) return whole;

    return `${whole || "0"}.${decimalParts.join("")}`;
  };

  const normalizeQuantityOnBlur = (id, value) => {
    if (!parseCount(value)) updateItem(id, { quantity: 1 });
  };

  const changeTotalQuantity = (item, amount) => {
    updateItem(item.id, {
      quantity: Math.max(1, parseCount(item.quantity) + amount),
    });
  };

  const toggleMember = (id, person) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    if (isIndividualQuantityItem(item)) {
      const members = item.members.includes(person)
        ? item.members.filter((member) => member !== person)
        : [...item.members, person];

      const memberQuantities = { ...(item.memberQuantities || {}) };
      if (!members.includes(person)) {
        delete memberQuantities[person];
      } else if (!parseCount(memberQuantities[person])) {
        memberQuantities[person] = "1";
      }

      updateItem(id, { members, memberQuantities });
      return;
    }

    const members = item.members.includes(person)
      ? item.members.filter((member) => member !== person)
      : [...item.members, person];
    updateItem(id, { members });
  };

  const setQuantityMode = (item, quantityMode) => {
    if (quantityMode === "individual") {
      updateItem(item.id, {
        quantityMode,
        memberQuantities: Object.fromEntries(
          item.members.map((person) => [
            person,
            item.memberQuantities?.[person] || "1",
          ]),
        ),
      });
      return;
    }

    updateItem(item.id, {
      quantityMode,
      quantity: getItemTotalQuantity(item) || item.quantity || 1,
      members: getItemParticipants(item),
    });
  };

  const toggleAllMembers = (item) => {
    if (isIndividualQuantityItem(item)) {
      const isAllSelected = item.members.length === people.length;
      updateItem(item.id, {
        members: isAllSelected ? [] : [...people],
        memberQuantities: isAllSelected
          ? {}
          : Object.fromEntries(
              people.map((person) => [
                person,
                item.memberQuantities?.[person] || "1",
              ]),
            ),
      });
      return;
    }

    updateItem(item.id, {
      members: item.members.length === people.length ? [] : [...people],
    });
  };

  const updateMemberQuantity = (item, person, value) => {
    const quantity = normalizeDecimalCountInput(value);
    const memberQuantities = { ...(item.memberQuantities || {}) };
    memberQuantities[person] = quantity;

    updateItem(item.id, {
      memberQuantities,
      members: item.members.includes(person)
        ? item.members
        : [...item.members, person],
    });
  };

  const hasValidItem = items.some(
    (item) =>
      item.menu &&
      item.price &&
      getItemParticipants(item).length &&
      getItemTotalQuantity(item),
  );

  return (
    <section className="page orders">
      <p className="eyebrow">STEP 02</p>
      <h1>
        무엇을 <em>먹었나요?</em>
      </h1>
      <div className="orders-toolbar">
        <p className="lead">메뉴와 금액을 적고, 함께 먹은 사람을 선택해주세요.</p>
        <button className="top-add" onClick={() => setItems([createItem(), ...items])}>
          + 메뉴 추가
        </button>
      </div>
      <div className="actions order-nav">
        <button className="back" onClick={onBack}>
          이전
        </button>
        <div className="order-nav-buttons">
          <button className="draft-save" onClick={onSaveDraft}>
            {draftSaved ? "저장 완료" : "임시 저장"}
          </button>
          <button className="primary" onClick={onResult} disabled={!hasValidItem}>
            정산 결과 보기 →
          </button>
        </div>
      </div>
      <div className="order-list">
        {items.map((item, index) => {
          const selectedCount = getItemParticipants(item).length;

          return (
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
                  <input
                    value={item.menu}
                    onChange={(event) => updateItem(item.id, { menu: event.target.value })}
                    placeholder="예: 마라탕"
                  />
                </label>
                <label>
                  가격
                  <input
                    type="number"
                    min="0"
                    value={item.price}
                    onChange={(event) => updateItem(item.id, { price: event.target.value })}
                    placeholder="0"
                  />
                  <span>원</span>
                </label>
                <label className="quantity-field">
                  <span className="quantity-label-row">
                    수량
                    <button
                      className={`quantity-toggle ${
                        isIndividualQuantityItem(item) ? "selected" : ""
                      }`}
                      onClick={() =>
                        setQuantityMode(
                          item,
                          isIndividualQuantityItem(item) ? "total" : "individual",
                        )
                      }
                      type="button"
                    >
                      {isIndividualQuantityItem(item) ? "개별" : "전체"}
                    </button>
                  </span>
                  {isIndividualQuantityItem(item) ? (
                    <input
                      className="quantity-total-readonly"
                      type="number"
                      disabled
                      value={getItemTotalQuantity(item) || ""}
                      aria-label="개별 수량 합계"
                    />
                  ) : (
                    <div className="quantity-control">
                      <button
                        onClick={() => changeTotalQuantity(item, -1)}
                        type="button"
                        aria-label="수량 감소"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: normalizeCountInput(event.target.value),
                          })
                        }
                        onBlur={(event) =>
                          normalizeQuantityOnBlur(item.id, event.target.value)
                        }
                      />
                      <button
                        onClick={() => changeTotalQuantity(item, 1)}
                        type="button"
                        aria-label="수량 증가"
                      >
                        +
                      </button>
                    </div>
                  )}
                </label>
              </div>
              <div className="member-select">
                <div>
                  <b>누가 먹었나요?</b>
                  <button onClick={() => toggleAllMembers(item)}>
                    {selectedCount === people.length ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="member-buttons">
                  {people.map((person) => {
                    const isSelected = item.members.includes(person);

                    return (
                      <div
                        className={`member-quantity ${isSelected ? "selected" : ""}`}
                        key={person}
                      >
                        <button
                          className={isSelected ? "selected" : ""}
                          onClick={() => toggleMember(item.id, person)}
                          type="button"
                        >
                          <span>{isSelected ? "✓" : "+"}</span>
                          {person}
                        </button>
                        {isIndividualQuantityItem(item) && isSelected ? (
                          <div className="person-quantity-control">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.]?[0-9]*"
                              value={item.memberQuantities?.[person] ?? ""}
                              onChange={(event) =>
                                updateMemberQuantity(
                                  item,
                                  person,
                                  event.target.value,
                                )
                              }
                              onBlur={(event) => {
                                if (!parseCount(event.target.value)) {
                                  updateMemberQuantity(item, person, "1");
                                }
                              }}
                              aria-label={`${person} 수량`}
                            />
                            <span className="quantity-unit">개</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default OrdersStep;
