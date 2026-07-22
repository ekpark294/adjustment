import InfoContent from "./InfoContent";

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
