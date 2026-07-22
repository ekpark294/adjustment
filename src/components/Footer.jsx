function Footer({ onNavigate }) {
  const move = (event, page) => {
    event.preventDefault();
    onNavigate(page);
  };

  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} 한입정산. All rights reserved.</p>
      <nav className="footer-links" aria-label="사이트 정보">
        <a href="/guide" onClick={(event) => move(event, "guide")}>
          사용 안내
        </a>
        <a href="/faq" onClick={(event) => move(event, "faq")}>
          자주 묻는 질문
        </a>
        <a href="/examples" onClick={(event) => move(event, "examples")}>
          정산 예시
        </a>
        <a href="/privacy" onClick={(event) => move(event, "privacy")}>
          개인정보처리방침
        </a>
        <a href="mailto:a01053878389@gmail.com?subject=%ED%95%9C%EC%9E%85%EC%A0%95%EC%82%B0%20%EB%AC%B8%EC%9D%98%20%EB%B0%8F%20%EB%B3%80%EA%B2%BD%EC%82%AC%ED%95%AD">
          문의
        </a>
      </nav>
    </footer>
  );
}

export default Footer;
