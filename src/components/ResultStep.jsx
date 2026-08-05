import { useMemo, useRef, useState } from "react";
import { downloadSectionImage } from "../utils/imageDownload";
import {
  calculateGrandTotal,
  calculateTotals,
  getItemNoteParts,
  getItemParticipants,
  getItemRound,
  getItemSplitAmount,
  getItemTotalQuantity,
  getUsedRounds,
  isIndividualQuantityItem,
  money,
} from "../utils/settlement";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function ResultStep({ people, items, roundsEnabled, onBack }) {
  const totalRef = useRef(null);
  const menuTableRef = useRef(null);
  const roundCardRef = useRef(null);
  const peopleCardRef = useRef(null);
  const [imageProgress, setImageProgress] = useState({
    section: "",
    percent: 0,
  });
  const [selectedPerson, setSelectedPerson] = useState("");
  const totals = useMemo(() => calculateTotals(people, items), [people, items]);
  const grandTotal = useMemo(() => calculateGrandTotal(items), [items]);
  const filledItems = useMemo(
    () => items.filter((item) => item.menu),
    [items],
  );

  /** 입력 순서(오래된 것부터)를 유지하되, 차수를 쓰면 차수별로 묶어서 보여준다. */
  const orderedItems = useMemo(() => {
    const list = filledItems.slice().reverse();
    if (!roundsEnabled) return list;

    return list
      .map((item, index) => ({ item, index }))
      .sort(
        (a, b) =>
          getItemRound(a.item) - getItemRound(b.item) || a.index - b.index,
      )
      .map(({ item }) => item);
  }, [filledItems, roundsEnabled]);

  const roundSummaries = useMemo(() => {
    if (!roundsEnabled) return [];

    return getUsedRounds(filledItems).map((round) => {
      const roundItems = filledItems.filter(
        (item) => getItemRound(item) === round,
      );

      return {
        round,
        count: roundItems.length,
        total: calculateGrandTotal(roundItems),
        totals: calculateTotals(people, roundItems),
      };
    });
  }, [filledItems, people, roundsEnabled]);

  const saveImage = async (ref, fileName, section, backgroundColor) => {
    if (!ref.current || imageProgress.section) return;

    setImageProgress({ section, percent: 10 });
    const timer = window.setInterval(() => {
      setImageProgress((current) => ({
        ...current,
        percent: Math.min(90, current.percent + 8),
      }));
    }, 180);

    try {
      await downloadSectionImage(
        ref.current,
        fileName,
        section,
        backgroundColor,
      );
      window.clearInterval(timer);
      setImageProgress({ section, percent: 100 });
      await wait(400);
    } catch (error) {
      console.error("이미지 저장에 실패했습니다.", error);
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      window.clearInterval(timer);
      setImageProgress({ section: "", percent: 0 });
    }
  };

  const buildCopyText = () => {
    const lines = Object.entries(totals).map(
      ([person, total]) => `${person}: ${money.format(Math.round(total))}원`,
    );

    if (!roundSummaries.length) return lines.join("\n");

    const roundLines = roundSummaries.flatMap(
      ({ round, total, totals: roundTotals }) => [
        `\n[${round}차] 총 ${money.format(total)}원`,
        ...people
          .filter((person) => Math.round(roundTotals[person]) > 0)
          .map(
            (person) =>
              `- ${person}: ${money.format(Math.round(roundTotals[person]))}원`,
          ),
      ],
    );

    return [...lines, ...roundLines].join("\n");
  };

  const imageButtonText = (section, defaultText) =>
    imageProgress.section === section
      ? `이미지 생성 ${imageProgress.percent}%`
      : defaultText;

  return (
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
        onClick={() => saveImage(totalRef, "총주문금액", "total", "#22231f")}
        disabled={Boolean(imageProgress.section)}
      >
        {imageButtonText("total", "총 주문 금액 이미지 저장")}
      </button>
      <section className="menu-summary">
        <div className="section-heading">
          <div>
            <p>ORDER DETAILS</p>
            <h2>메뉴별 분배 내역</h2>
          </div>
          <span>{filledItems.length}개 메뉴</span>
        </div>
        <div className="table-scroll card">
          <table className={roundsEnabled ? "has-round" : ""} ref={menuTableRef}>
            <thead>
              <tr>
                <th>번호</th>
                {roundsEnabled && <th>차수</th>}
                <th>메뉴</th>
                <th>가격</th>
                <th>수량</th>
                <th>인원</th>
                <th>분배 금액</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {orderedItems.map((item, index) => {
                const share = Math.round(getItemSplitAmount(item));
                const participants = getItemParticipants(item, people);
                const noteParts = getItemNoteParts(item, people);
                const isIndividual = isIndividualQuantityItem(item);
                const isHighlighted =
                  selectedPerson && participants.includes(selectedPerson);
                const displayPrice =
                  Number(item.price || 0) *
                  (isIndividual ? getItemTotalQuantity(item) : 1);

                return (
                  <tr
                    className={isHighlighted ? "person-menu-highlight" : ""}
                    key={item.id}
                  >
                    <td className="menu-number">{index + 1}</td>
                    {roundsEnabled && (
                      <td>
                        <span className="round-tag">{getItemRound(item)}차</span>
                      </td>
                    )}
                    <td>
                      <b>{item.menu}</b>
                    </td>
                    <td>₩{money.format(displayPrice)}</td>
                    <td>{getItemTotalQuantity(item)}</td>
                    <td>{participants.length}</td>
                    <td>
                      <strong>
                        {isIndividual
                          ? `개당 ₩${money.format(Number(item.price || 0))}`
                          : `₩${money.format(share)}`}
                      </strong>
                    </td>
                    <td>
                      {noteParts.length ? (
                        <span className="note-list">
                          {noteParts.map(({ person, quantity }, noteIndex) => (
                            <span className="note-person-entry" key={person}>
                              <span
                                className={
                                  selectedPerson === person
                                    ? "selected-note-person"
                                    : ""
                                }
                              >
                                {person}
                              </span>
                              {isIndividual ? ` ${quantity}개` : ""}
                              {noteIndex < noteParts.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </span>
                      ) : (
                        "선택된 사람 없음"
                      )}
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
          saveImage(menuTableRef, "메뉴별분배내역", "menu", "#ffffff")
        }
        disabled={Boolean(imageProgress.section)}
      >
        {imageButtonText("menu", "메뉴별 분배 내역 이미지 저장")}
      </button>
      {roundSummaries.length > 0 && (
        <>
          <section className="round-summary">
            <div className="section-heading">
              <div>
                <p>ROUNDS</p>
                <h2>차수별 정산 금액</h2>
              </div>
              <span>{roundSummaries.length}개 차수</span>
            </div>
            <div className="round-summary-list" ref={roundCardRef}>
              {roundSummaries.map(({ round, count, total, totals: roundTotals }) => (
                <article className="card round-card" key={round}>
                  <div className="round-card-head">
                    <b>{round}차</b>
                    <span>{count}개 메뉴</span>
                    <strong>₩{money.format(total)}</strong>
                  </div>
                  <div className="round-card-people">
                    {people
                      .filter((person) => Math.round(roundTotals[person]) > 0)
                      .map((person) => (
                        <span
                          className={`round-person ${
                            selectedPerson === person ? "selected" : ""
                          }`}
                          key={person}
                        >
                          {person}
                          <b>
                            {money.format(Math.round(roundTotals[person]))}원
                          </b>
                        </span>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <button
            className="image-save-button"
            onClick={() =>
              saveImage(roundCardRef, "차수별정산금액", "round", "#f5f4ee")
            }
            disabled={Boolean(imageProgress.section)}
          >
            {imageButtonText("round", "차수별 정산 금액 이미지 저장")}
          </button>
        </>
      )}
      <div className="people-summary">
        <div className="section-heading people-heading">
          <div>
            <p>SETTLEMENT</p>
            <h2>인원별 정산 금액</h2>
          </div>
        </div>
        <div className="card result-card" ref={peopleCardRef}>
          {people.map((person, index) => (
            <button
              className={`result-row ${
                selectedPerson === person ? "selected" : ""
              }`}
              key={person}
              onClick={() =>
                setSelectedPerson((current) =>
                  current === person ? "" : person,
                )
              }
              type="button"
              aria-pressed={selectedPerson === person}
            >
              <span className="avatar">{index + 1}</span>
              <b>{person}</b>
              <strong>{money.format(Math.round(totals[person]))}원</strong>
            </button>
          ))}
        </div>
      </div>
      <button
        className="image-save-button"
        onClick={() =>
          saveImage(peopleCardRef, "인원별정산금액", "people", "#ffffff")
        }
        disabled={Boolean(imageProgress.section)}
      >
        {imageButtonText("people", "인원별 정산 금액 이미지 저장")}
      </button>
      <div className="actions">
        <button className="back" onClick={onBack}>
          다시 수정하기
        </button>
        <div className="result-buttons">
          <button
            className="copy-button"
            onClick={() => navigator.clipboard?.writeText(buildCopyText())}
          >
            결과 복사
          </button>
        </div>
      </div>
    </section>
  );
}

export default ResultStep;
