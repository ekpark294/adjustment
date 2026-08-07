import packageInfo from "../../package.json";

function Header({ step, onHome }) {
  return (
    <header>
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onHome();
        }}
      >
        {/* 폰트 글리프는 베이스라인 기준이라 원 안에서 아래로 치우친다. 도형으로 그려 정확히 중앙에 둔다. */}
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15">
            <circle cx="12" cy="5.4" r="2.2" />
            <rect x="2.4" y="10.7" width="19.2" height="2.6" rx="1.3" />
            <circle cx="12" cy="18.6" r="2.2" />
          </svg>
        </span>
        <span>한입정산</span>
        <small className="version">v{packageInfo.version}</small>
      </a>
      <div className="steps" aria-label="진행 단계">
        <span className={step === 1 ? "active" : ""}>1. 참여자</span>
        <i />
        <span className={step === 2 ? "active" : ""}>2. 주문 내역</span>
        <i />
        <span className={step === 3 ? "active" : ""}>3. 정산 결과</span>
      </div>
    </header>
  );
}

export default Header;
