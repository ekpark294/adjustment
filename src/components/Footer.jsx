function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} 한입정산. All rights reserved.</p>
      <a href="mailto:a01053878389@gmail.com?subject=%ED%95%9C%EC%9E%85%EC%A0%95%EC%82%B0%20%EB%AC%B8%EC%9D%98%20%EB%B0%8F%20%EB%B3%80%EA%B2%BD%EC%82%AC%ED%95%AD">
        문의 및 변경사항 보내기
      </a>
    </footer>
  );
}

export default Footer;
