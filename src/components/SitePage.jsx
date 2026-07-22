function GuidePage({ onHome }) {
  return (
    <section className="page site-page">
      <button className="back" onClick={onHome} type="button">
        한입정산으로 돌아가기
      </button>
      <p className="eyebrow">GUIDE</p>
      <h1>사용 안내</h1>
      <p className="lead">
        한입정산은 여러 사람이 함께 결제한 음식값을 메뉴별 참여자 기준으로
        나누는 정산 계산기입니다.
      </p>
      <div className="site-section">
        <h2>기본 사용 순서</h2>
        <ol>
          <li>정산에 참여할 사람의 이름을 추가합니다.</li>
          <li>메뉴 이름, 가격, 수량을 입력합니다.</li>
          <li>각 메뉴를 먹은 사람을 선택합니다.</li>
          <li>필요하면 개별 수량 모드로 바꿔 사람별 수량을 입력합니다.</li>
          <li>정산 결과에서 메뉴별 분배 내역과 인원별 금액을 확인합니다.</li>
        </ol>
      </div>
      <div className="site-grid">
        <article>
          <h2>전체 수량</h2>
          <p>
            메뉴 총액을 선택된 사람 수로 나눕니다. 예를 들어 24,000원 메뉴를
            3명이 먹으면 각자 8,000원을 부담합니다.
          </p>
        </article>
        <article>
          <h2>개별 수량</h2>
          <p>
            참여자별 수량에 개당 가격을 곱합니다. 4,000원짜리 메뉴를 0.5개
            먹은 사람은 2,000원을 부담합니다.
          </p>
        </article>
      </div>
      <div className="site-section">
        <h2>결과 화면 활용</h2>
        <p>
          인원별 정산 금액을 클릭하면 해당 사람이 포함된 메뉴가 강조되어 어떤
          메뉴 때문에 금액이 계산됐는지 쉽게 볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}

function PrivacyPage({ onHome }) {
  return (
    <section className="page site-page">
      <button className="back" onClick={onHome} type="button">
        한입정산으로 돌아가기
      </button>
      <p className="eyebrow">POLICY</p>
      <h1>개인정보처리방침</h1>
      <p className="lead">시행일: 2026년 7월 22일</p>
      <div className="site-section">
        <h2>수집하는 정보</h2>
        <p>
          한입정산은 별도 회원가입을 제공하지 않으며, 이름, 이메일, 전화번호
          같은 개인정보를 서버 데이터베이스에 저장하지 않습니다. 사용자가 임시
          저장을 선택하면 참여자와 메뉴 정보가 해당 브라우저의 localStorage에
          저장됩니다.
        </p>
      </div>
      <div className="site-section">
        <h2>광고와 쿠키</h2>
        <p>
          한입정산은 Google AdSense 등 Google 광고 서비스를 사용할 수 있습니다.
          이 과정에서 Google과 제3자가 쿠키, 웹 비콘, IP 주소, 광고 식별자 등
          기술을 사용해 광고 제공, 광고 개인화, 광고 성과 측정에 필요한 정보를
          처리할 수 있습니다.
        </p>
        <p>
          Google이 파트너 사이트 또는 앱에서 정보를 사용하는 방식은{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google 안내 페이지
          </a>
          에서 확인할 수 있습니다.
        </p>
      </div>
      <div className="site-section">
        <h2>문의</h2>
        <p>
          개인정보처리방침 또는 서비스 이용과 관련한 문의는{" "}
          <a href="mailto:a01053878389@gmail.com">a01053878389@gmail.com</a>
          으로 보낼 수 있습니다.
        </p>
      </div>
    </section>
  );
}

function SitePage({ type, onHome }) {
  return type === "privacy" ? (
    <PrivacyPage onHome={onHome} />
  ) : (
    <GuidePage onHome={onHome} />
  );
}

export default SitePage;
