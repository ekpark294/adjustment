export const downloadSectionImage = async (
  target,
  fileName,
  sectionName,
  backgroundColor = "#f5f4ee",
  maxWidth = 0,
) => {
  const { toPng } = await import("html-to-image");
  const tableWidth = target.matches?.("table")
    ? target.scrollWidth
    : target.querySelector("table")?.scrollWidth || 0;
  // 좁은 목록을 화면 폭 그대로 담으면 이름과 금액 사이가 크게 벌어진다.
  // 상한을 주면 내용에 맞춰 좁게 잡혀 간격이 자연스러워진다.
  const naturalWidth = Math.max(
    target.clientWidth,
    target.scrollWidth,
    tableWidth,
  );
  const captureWidth = maxWidth
    ? Math.min(naturalWidth, maxWidth)
    : naturalWidth;
  const isTotal = sectionName === "total";
  const captureHeight =
    Math.max(target.clientHeight, target.scrollHeight) + (isTotal ? 32 : 0);
  const captureStyle = {
    width: `${captureWidth}px`,
    height: `${captureHeight}px`,
    overflow: "visible",
  };

  if (isTotal) {
    Object.assign(captureStyle, {
      margin: "0",
      padding: "24px 28px",
      alignItems: "center",
      boxSizing: "border-box",
    });
  }

  const dataUrl = await toPng(target, {
    backgroundColor,
    cacheBust: true,
    pixelRatio: 2,
    width: captureWidth,
    height: captureHeight,
    style: captureStyle,
  });
  const link = document.createElement("a");
  link.download = `한입정산-${fileName}-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
};
