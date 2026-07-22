export const privacyContent = {
  eyebrow: "POLICY",
  title: "개인정보처리방침",
  lead: "시행일: 2026년 7월 22일",
  sections: [
    {
      title: "수집하는 정보",
      body:
        "한입정산은 별도 회원가입을 제공하지 않으며, 이름, 이메일, 전화번호 같은 개인정보를 서버 데이터베이스에 저장하지 않습니다. 사용자가 임시 저장을 선택하면 참여자와 메뉴 정보가 해당 브라우저의 localStorage에 저장됩니다.",
    },
    {
      title: "광고와 쿠키",
      body:
        "한입정산은 Google AdSense 등 Google 광고 서비스를 사용할 수 있습니다. 이 과정에서 Google과 제3자가 쿠키, 웹 비콘, IP 주소, 광고 식별자 등 기술을 사용해 광고 제공, 광고 개인화, 광고 성과 측정에 필요한 정보를 처리할 수 있습니다.",
      after: (
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
      ),
    },
    {
      title: "문의",
      body: (
        <>
          개인정보처리방침 또는 서비스 이용과 관련한 문의는{" "}
          <a href="mailto:a01053878389@gmail.com">a01053878389@gmail.com</a>
          으로 보낼 수 있습니다.
        </>
      ),
    },
  ],
};
