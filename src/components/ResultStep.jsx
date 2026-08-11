import { useEffect, useMemo, useRef, useState } from "react";
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
import { buildShareUrl } from "../utils/shareLink";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

/** 방향 화살표. 폰트 글리프는 기준선 때문에 위치가 흔들려 도형으로 그린다. */
const Arrow = ({ up = false }) => (
  <svg viewBox="0 0 10 14" width="9" height="12" aria-hidden="true">
    <path
      d={up ? "M5 12.5V2.5M1.6 5.9 5 2.5l3.4 3.4" : "M5 1.5v10M1.6 8.1 5 11.5l3.4-3.4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function ResultStep({
  people,
  items,
  roundsEnabled,
  sharedView = false,
  onContinue,
  onBack,
}) {
  const totalRef = useRef(null);
  const menuTableRef = useRef(null);
  const roundCardRef = useRef(null);
  const peopleCardRef = useRef(null);
  const [imageProgress, setImageProgress] = useState({
    section: "",
    percent: 0,
  });
  const [selectedPerson, setSelectedPerson] = useState("");
  // "" | "loading" | "copied"
  const [shareState, setShareState] = useState("");
  const [sort, setSort] = useState("order");
  const totals = useMemo(() => calculateTotals(people, items), [people, items]);
  const grandTotal = useMemo(() => calculateGrandTotal(items), [items]);
  const filledItems = useMemo(() => items.filter((item) => item.menu), [items]);

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

  /** 번호는 사람이 아니라 화면에 놓인 자리를 가리킨다. 어떻게 정렬해도 위에서부터 1, 2, 3으로 읽힌다. */
  const sortedPeople = useMemo(() => {
    const amount = (person) => totals[person] || 0;
    const byName = (a, b) => a.localeCompare(b, "ko");

    const compare = {
      "name-asc": byName,
      "name-desc": (a, b) => byName(b, a),
      "amount-desc": (a, b) => amount(b) - amount(a),
      "amount-asc": (a, b) => amount(a) - amount(b),
    }[sort];

    return compare ? people.slice().sort(compare) : people;
  }, [people, totals, sort]);

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

  /**
   * tight를 켜면 카드를 내용 폭까지 줄여서 저장한다.
   *
   * 폭은 저장 직전에 실제로 좁혀야 한다. html-to-image가 계산된 스타일을 픽셀 값으로
   * 복제본에 그대로 옮기기 때문에, 캔버스 크기만 줄이면 내용이 잘린다.
   *
   * 대신 화면에 있는 카드를 건드리면 저장 중에 레이아웃이 흔들려 오작동처럼 보인다.
   * 그래서 화면 밖에 복제본을 만들어 그것만 좁히고, 끝나면 지운다.
   */
  const saveImage = async (ref, fileName, section, backgroundColor, tight) => {
    if (!ref.current || imageProgress.section) return;

    setImageProgress({ section, percent: 10 });
    const timer = window.setInterval(() => {
      setImageProgress((current) => ({
        ...current,
        percent: Math.min(90, current.percent + 8),
      }));
    }, 180);

    // 화면 밖으로 보내는 건 감싸는 상자여야 한다.
    // 카드 자체에 위치를 주면 그 값이 캡처용 복제본까지 따라가 캔버스 밖에 그려진다.
    let holder = null;
    let offscreen = null;
    if (tight) {
      holder = document.createElement("div");
      holder.className = "capture-holder";
      offscreen = ref.current.cloneNode(true);
      offscreen.classList.add("capture-tight");
      holder.appendChild(offscreen);
      document.body.appendChild(holder);
    }

    try {
      await downloadSectionImage(
        offscreen || ref.current,
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
      holder?.remove();
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

  /**
   * 링크는 버튼을 누른 시점에 만든다.
   * 미리 만들어 두면 공유할 생각이 없는 사람의 내역까지 서버에 저장된다.
   *
   * 모바일에서는 기본 공유 시트를, 그 외에는 클립보드 복사를 쓴다.
   * iOS Safari는 사용자 조작 직후에만 공유 시트를 열어 주는데, 링크를 만드는 사이에
   * 그 자격이 사라질 수 있다. 그때는 예외를 잡아 복사로 넘어간다.
   */
  const shareResult = async () => {
    if (shareState === "loading") return;
    setShareState("loading");

    try {
      const url = await buildShareUrl(people, items, roundsEnabled);
      const canNativeShare =
        Boolean(navigator.share) &&
        window.matchMedia("(pointer: coarse)").matches;

      if (canNativeShare) {
        try {
          await navigator.share({ title: "한입정산 정산 결과", url });
          setShareState("");
          return;
        } catch (error) {
          if (error?.name === "AbortError") {
            setShareState("");
            return;
          }
          console.error("공유 시트를 열지 못해 복사로 대체합니다.", error);
        }
      }

      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState(""), 1800);
    } catch (error) {
      console.error("공유 링크를 만들지 못했습니다.", error);
      window.alert("공유 링크를 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
      setShareState("");
    }
  };

  const imageButtonText = (section, defaultText) =>
    imageProgress.section === section
      ? `이미지 생성 ${imageProgress.percent}%`
      : defaultText;

  return (
    <section className="page result">
      <p className="eyebrow">{sharedView ? "SHARED" : "STEP 03"}</p>
      <h1>
        {sharedView ? (
          <>
            공유받은 <em>정산 내역이에요.</em>
          </>
        ) : (
          <>
            깔끔하게 <em>나눴어요.</em>
          </>
        )}
      </h1>
      {sharedView && (
        <p className="shared-notice">
          링크에 담긴 내역을 그대로 보여드려요. 이 화면에서 수정해도 보낸 사람의
          내역은 바뀌지 않아요.
        </p>
      )}
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
          <table
            className={roundsEnabled ? "has-round" : ""}
            ref={menuTableRef}
          >
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
                // 차수가 바뀌는 첫 행에 굵은 선을 올려 차수 구간을 나눈다.
                const startsRound =
                  roundsEnabled &&
                  index > 0 &&
                  getItemRound(orderedItems[index - 1]) !== getItemRound(item);

                return (
                  <tr
                    className={`${isHighlighted ? "person-menu-highlight" : ""} ${
                      startsRound ? "round-group-start" : ""
                    }`}
                    key={item.id}
                  >
                    <td className="menu-number">{index + 1}</td>
                    {roundsEnabled && (
                      <td>
                        <span className="round-tag">
                          {getItemRound(item)}차
                        </span>
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
              {roundSummaries.map(
                ({ round, count, total, totals: roundTotals }) => (
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
                            <span>{person}</span>
                            <b>
                              {money.format(Math.round(roundTotals[person]))}원
                            </b>
                          </span>
                        ))}
                    </div>
                  </article>
                ),
              )}
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
        <div className="people-sort" role="group" aria-label="정렬 기준">
          <button
            className={sort === "order" ? "selected" : ""}
            onClick={() => setSort("order")}
            type="button"
            aria-pressed={sort === "order"}
          >
            <span className="sort-mark sort-bars">
              <i />
              <i />
              <i />
            </span>
            등록순
          </button>
          <button
            className={sort.startsWith("name") ? "selected" : ""}
            onClick={() =>
              setSort(sort === "name-asc" ? "name-desc" : "name-asc")
            }
            type="button"
            aria-pressed={sort.startsWith("name")}
            title="다시 누르면 반대 방향으로 정렬돼요"
          >
            <span className="sort-mark">
              <em>{sort === "name-desc" ? "ㅎ" : "ㄱ"}</em>
              <Arrow />
              <em>{sort === "name-desc" ? "ㄱ" : "ㅎ"}</em>
            </span>
            이름순
          </button>
          <button
            className={sort.startsWith("amount") ? "selected" : ""}
            onClick={() =>
              setSort(sort === "amount-desc" ? "amount-asc" : "amount-desc")
            }
            type="button"
            aria-pressed={sort.startsWith("amount")}
            title="다시 누르면 반대 방향으로 정렬돼요"
          >
            <span className="sort-mark">
              <Arrow up={sort === "amount-asc"} />
            </span>
            금액 {sort === "amount-asc" ? "낮은순" : "높은순"}
          </button>
        </div>
        <p className={`people-guide ${selectedPerson ? "active" : ""}`}>
          {selectedPerson ? (
            <>
              <b>{selectedPerson}</b> 님이 참여한 메뉴를 강조해서 보고 있어요.
              한 번 더 누르면 해제됩니다.
            </>
          ) : (
            <>
              이름을 누르면 그 사람이 참여한 메뉴가 위쪽 분배 내역
              {roundSummaries.length > 0 ? "과 차수별 금액" : ""}에서 강조돼요.
            </>
          )}
        </p>
        <div className="card result-card" ref={peopleCardRef}>
          {sortedPeople.map((person, index) => (
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
          saveImage(peopleCardRef, "인원별정산금액", "people", "#ffffff", true)
        }
        disabled={Boolean(imageProgress.section)}
      >
        {imageButtonText("people", "인원별 정산 금액 이미지 저장")}
      </button>
      <div className="floating-actions result-actions">
        <button className="back" onClick={onBack}>
          {sharedView ? "새로 정산하기" : "다시 수정하기"}
        </button>
        <div className="result-buttons">
          <button
            className="copy-button"
            onClick={() => navigator.clipboard?.writeText(buildCopyText())}
          >
            결과 복사
          </button>
          {sharedView ? (
            <button className="primary" onClick={onContinue}>
              이 내역으로 계속하기
            </button>
          ) : (
            <button
              className="share-button"
              onClick={shareResult}
              disabled={shareState === "loading"}
            >
              {shareState === "loading"
                ? "링크 만드는 중…"
                : shareState === "copied"
                  ? "링크 복사 완료"
                  : "공유 링크"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ResultStep;
