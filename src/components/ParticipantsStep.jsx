import { useRef, useState } from "react";
import InfoContent from "./InfoContent";

const moveInList = (list, from, to) => {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function ParticipantsStep({
  name,
  setName,
  people,
  setPeople,
  items,
  setItems,
  drafts,
  onLoadDraft,
  onDeleteDraft,
  onNext,
}) {
  const listRef = useRef(null);
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const addPerson = () => {
    const value = name.trim();
    if (!value || people.includes(value)) return;
    setPeople([...people, value]);
    setName("");
  };

  const removePerson = (person) => {
    setPeople(people.filter((item) => item !== person));
    setItems(
      items.map((item) => {
        const memberQuantities = { ...(item.memberQuantities || {}) };
        delete memberQuantities[person];

        return {
          ...item,
          members: item.members.filter((member) => member !== person),
          memberQuantities,
        };
      }),
    );
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.repeat)
      return;
    event.preventDefault();
    addPerson();
  };

  // 순서 변경은 people 배열만 건드린다. 주문 내역은 이름으로 선택을 저장하므로 영향받지 않는다.
  const movePerson = (from, to) => {
    const target = clamp(to, 0, people.length - 1);
    if (from === target) return;
    setPeople(moveInList(people, from, target));
  };

  const canStartDrag = (event) => {
    if (event.target.closest("[data-drag-handle]")) return true;
    // 터치는 손잡이에서만 시작해야 목록 위 스크롤이 막히지 않는다.
    if (event.pointerType === "touch") return false;
    return !event.target.closest("button");
  };

  const beginDrag = (event, index) => {
    if (people.length < 2 || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!canStartDrag(event)) return;

    const rows = listRef.current?.querySelectorAll("[data-person-row]");
    if (!rows || rows.length < 2) return;

    // offsetTop은 transform의 영향을 받지 않아, 직전 드래그의 복귀 애니메이션 중에도 값이 정확하다.
    const step = rows[1].offsetTop - rows[0].offsetTop;
    if (!step) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      fromIndex: index,
      toIndex: index,
      step,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ fromIndex: index, toIndex: index, offset: 0, step });
  };

  const updateDrag = (event) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const offset = event.clientY - state.startY;
    state.toIndex = clamp(
      state.fromIndex + Math.round(offset / state.step),
      0,
      people.length - 1,
    );
    setDrag({
      fromIndex: state.fromIndex,
      toIndex: state.toIndex,
      offset,
      step: state.step,
    });
  };

  const finishDrag = (event, commit) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setDrag(null);
    if (commit) movePerson(state.fromIndex, state.toIndex);
  };

  const handleHandleKeyDown = (event, index) => {
    const direction =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    movePerson(index, index + direction);
  };

  /** 드래그 중인 줄은 손가락을 따라가고, 지나친 줄들은 한 칸씩 비켜준다. */
  const rowOffset = (index) => {
    if (!drag) return 0;
    const { fromIndex, toIndex, offset, step } = drag;
    if (index === fromIndex) return offset;
    if (fromIndex < toIndex && index > fromIndex && index <= toIndex)
      return -step;
    if (fromIndex > toIndex && index >= toIndex && index < fromIndex)
      return step;
    return 0;
  };

  return (
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
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="이름을 입력하세요"
            autoFocus
          />
          <button className="add" onClick={addPerson} aria-label="참여자 추가">
            ＋
          </button>
        </div>
        <div
          className={`people-list ${drag ? "reordering" : ""}`}
          ref={listRef}
        >
          {people.length === 0 && (
            <p className="empty">아직 추가된 사람이 없어요.</p>
          )}
          {people.map((person, index) => {
            const offset = rowOffset(index);

            return (
              <div
                className={`person ${
                  drag?.fromIndex === index ? "dragging" : ""
                }`}
                data-person-row
                key={person}
                onPointerCancel={(event) => finishDrag(event, false)}
                onPointerDown={(event) => beginDrag(event, index)}
                onPointerMove={updateDrag}
                onPointerUp={(event) => finishDrag(event, true)}
                style={
                  offset ? { transform: `translateY(${offset}px)` } : undefined
                }
              >
                <button
                  className="drag-handle"
                  data-drag-handle
                  onKeyDown={(event) => handleHandleKeyDown(event, index)}
                  type="button"
                  aria-label={`${person} 순서 변경`}
                  title="드래그하거나 방향키로 순서를 바꿀 수 있어요"
                >
                  ⠿
                </button>
                <span className="avatar">{index + 1}</span>
                <b>{person}</b>
                <button
                  onClick={() => removePerson(person)}
                  aria-label={`${person} 삭제`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {people.length > 1 && (
          <p className="people-hint">
            왼쪽 손잡이를 드래그하면 순서를 바꿀 수 있어요.
          </p>
        )}
      </div>
      <button className="primary" disabled={people.length < 2} onClick={onNext}>
        주문 내역 입력하기 <span>→</span>
      </button>
      {people.length < 2 && <small>정산하려면 2명 이상 추가해주세요.</small>}
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
                  onClick={() => onLoadDraft(draft)}
                >
                  <b>
                    {draft.people.slice(0, 3).join(", ")}
                    {draft.people.length > 3
                      ? ` 외 ${draft.people.length - 3}명`
                      : ""}
                  </b>
                  <span>
                    {draft.items.filter((item) => item.menu).length}개 메뉴 ·{" "}
                    {new Date(draft.updatedAt).toLocaleString("ko-KR")}
                  </span>
                </button>
                <button
                  className="draft-delete"
                  onClick={() => onDeleteDraft(draft.id)}
                  aria-label="임시 저장 내역 삭제"
                >
                  삭제
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <InfoContent />
    </section>
  );
}

export default ParticipantsStep;
