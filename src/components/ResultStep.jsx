import { useMemo, useRef, useState } from "react";
import { downloadSectionImage } from "../utils/imageDownload";
import {
  calculateGrandTotal,
  calculateTotals,
  getItemNote,
  getItemParticipants,
  getItemSplitAmount,
  getItemTotalQuantity,
  money,
} from "../utils/settlement";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function ResultStep({ people, items, onBack }) {
  const totalRef = useRef(null);
  const menuTableRef = useRef(null);
  const peopleCardRef = useRef(null);
  const [imageProgress, setImageProgress] = useState({
    section: "",
    percent: 0,
  });
  const totals = useMemo(() => calculateTotals(people, items), [people, items]);
  const grandTotal = useMemo(() => calculateGrandTotal(items), [items]);

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
                .slice()
                .reverse()
                .map((item, index) => {
                  const share = Math.round(getItemSplitAmount(item));
                  const participants = getItemParticipants(item);

                  return (
                    <tr key={item.id}>
                      <td className="menu-number">{index + 1}</td>
                      <td>
                        <b>{item.menu}</b>
                      </td>
                      <td>₩{money.format(Number(item.price))}</td>
                      <td>{getItemTotalQuantity(item)}</td>
                      <td>{participants.length}</td>
                      <td>
                        <strong>₩{money.format(share)}</strong>
                      </td>
                      <td>{getItemNote(item)}</td>
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
      <div className="people-summary">
        <div className="section-heading people-heading">
          <div>
            <p>SETTLEMENT</p>
            <h2>인원별 정산 금액</h2>
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
  );
}

export default ResultStep;
