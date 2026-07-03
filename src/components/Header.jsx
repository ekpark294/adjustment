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
        <span className="logo">÷</span>
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
