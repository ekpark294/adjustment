/** 이미지 데이터만 만든다. 저장과 분리해 두어야 결과를 눈으로 확인할 수 있다. */
export const renderSectionImage = async (
  target,
  sectionName,
  backgroundColor = "#f5f4ee",
) => {
  const { toPng } = await import("html-to-image");
  const tableWidth = target.matches?.("table")
    ? target.scrollWidth
    : target.querySelector("table")?.scrollWidth || 0;
  // 폭을 임의로 줄이면 내용이 잘린다. 항상 실제 내용이 차지하는 만큼 잡는다.
  // box-sizing이 border-box라 테두리를 포함하는 offsetWidth를 써야 한다.
  // clientWidth를 쓰면 그 값을 width로 되돌릴 때 테두리 두께만큼 내용이 좁아져 끝이 잘린다.
  const captureWidth = Math.max(
    target.offsetWidth,
    target.scrollWidth,
    tableWidth,
  );
  const isTotal = sectionName === "total";
  const captureHeight =
    Math.max(target.offsetHeight, target.scrollHeight) + (isTotal ? 32 : 0);
  const captureStyle = {
    width: `${captureWidth}px`,
    height: `${captureHeight}px`,
    overflow: "visible",
    // 대상이 화면 밖에 배치돼 있어도 캔버스 원점에 그리도록 위치를 초기화한다.
    // 이 값이 빠지면 복제본이 캔버스 밖에 그려져 빈 이미지가 나온다.
    position: "static",
    inset: "auto",
    transform: "none",
  };

  if (isTotal) {
    Object.assign(captureStyle, {
      margin: "0",
      padding: "24px 28px",
      alignItems: "center",
      boxSizing: "border-box",
    });
  }

  return toPng(target, {
    backgroundColor,
    cacheBust: true,
    pixelRatio: 2,
    width: captureWidth,
    height: captureHeight,
    style: captureStyle,
  });
};

export const downloadSectionImage = async (
  target,
  fileName,
  sectionName,
  backgroundColor = "#f5f4ee",
) => {
  const dataUrl = await renderSectionImage(target, sectionName, backgroundColor);
  const link = document.createElement("a");
  link.download = `한입정산-${fileName}-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
};
