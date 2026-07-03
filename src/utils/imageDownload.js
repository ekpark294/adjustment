export const downloadSectionImage = async (
  target,
  fileName,
  sectionName,
  backgroundColor = "#f5f4ee",
) => {
  const { toPng } = await import("html-to-image");
  const tableWidth = target.matches?.("table")
    ? target.scrollWidth
    : target.querySelector("table")?.scrollWidth || 0;
  const captureWidth = Math.max(
    target.clientWidth,
    target.scrollWidth,
    tableWidth,
  );
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
