function InfoContent() {
  return (
    <section className="info-content" aria-label="한입정산 사용 안내">
      <div>
        <p className="eyebrow">GUIDE</p>
        <h2>메뉴별로 다르게 먹은 모임을 계산합니다.</h2>
        <p>
          한입정산은 모든 비용을 단순히 인원수로 나누는 계산기가 아니라,
          메뉴마다 실제로 먹은 사람을 선택해 각자의 부담 금액을 계산하는
          더치페이 도구입니다. 여러 명이 함께 주문했지만 메뉴별 참여자가 다를
          때 사용하기 좋습니다.
        </p>
      </div>
      <div className="info-grid">
        <article>
          <h3>전체 수량 메뉴</h3>
          <p>
            한 메뉴를 선택된 인원이 함께 나눠 먹은 경우 사용합니다. 메뉴
            가격에 수량을 곱한 총액을 선택된 인원 수로 나눠 1인 부담금을
            계산합니다.
          </p>
        </article>
        <article>
          <h3>개별 수량 메뉴</h3>
          <p>
            사람마다 먹은 개수가 다를 때 사용합니다. 1개, 0.5개처럼 참여자별
            수량을 입력하면 개당 가격에 각자의 수량을 곱해 정산 금액에
            반영합니다.
          </p>
        </article>
        <article>
          <h3>결과 확인</h3>
          <p>
            정산 결과에서는 총 주문 금액, 메뉴별 분배 내역, 인원별 정산
            금액을 확인할 수 있습니다. 인원별 금액을 클릭하면 해당 인원이
            포함된 메뉴를 쉽게 확인할 수 있습니다.
          </p>
        </article>
      </div>
    </section>
  );
}

export default InfoContent;
