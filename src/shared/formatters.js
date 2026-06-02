export const formatNumber = new Intl.NumberFormat("en-US");
export const formatCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});
