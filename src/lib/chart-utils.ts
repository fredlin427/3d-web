// Shared chart utilities — extracted from chart-data route for reuse

/** Auto-group small items into "Other" when too many */
export function groupTopN<T extends { label: string; value: number }>(items: T[], topN: number): T[] {
  if (items.length <= topN) return items;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const otherValue = sorted.slice(topN).reduce((s, r) => s + r.value, 0);
  if (otherValue > 0) top.push({ label: `Others (${sorted.length - topN} items)`, value: otherValue } as T);
  return top;
}

/** Build stacked result from groupBy records [{primary, secondary, count}] */
export function buildStacked(
  records: { primary: string; secondary: string; count: number }[],
  groupTop = 0,
  childTop = 0,
): { label: string; value: number; children: { label: string; value: number }[] }[] {
  const map = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (!map.has(r.primary)) map.set(r.primary, new Map());
    const inner = map.get(r.primary)!;
    inner.set(r.secondary, (inner.get(r.secondary) || 0) + r.count);
  }
  let stacked: { label: string; value: number; children: { label: string; value: number }[] }[] = [];
  for (const [primary, innerMap] of map) {
    const total = Array.from(innerMap.values()).reduce((s, v) => s + v, 0);
    const children = Array.from(innerMap.entries())
      .map(([l, v]) => ({ label: l, value: v }))
      .sort((a, b) => b.value - a.value);
    const finalChildren = childTop > 0 && children.length > childTop
      ? (() => {
          const top = children.slice(0, childTop);
          const otherVal = children.slice(childTop).reduce((s, c) => s + c.value, 0);
          if (otherVal > 0) top.push({ label: `Others (${children.length - childTop})`, value: otherVal });
          return top;
        })()
      : children;
    stacked.push({ label: primary, value: total, children: finalChildren });
  }
  stacked.sort((a, b) => b.value - a.value);
  if (groupTop > 0 && stacked.length > groupTop) {
    const top = stacked.slice(0, groupTop);
    const otherChildren = stacked.slice(groupTop).flatMap(g => g.children);
    const otherVal = stacked.slice(groupTop).reduce((s, g) => s + g.value, 0);
    if (otherVal > 0) {
      const merged = new Map<string, number>();
      for (const c of otherChildren) merged.set(c.label, (merged.get(c.label) || 0) + c.value);
      const mergedChildren = Array.from(merged.entries())
        .map(([l, v]) => ({ label: l, value: v }))
        .sort((a, b) => b.value - a.value);
      top.push({ label: `Others (${stacked.length - groupTop} groups)`, value: otherVal, children: mergedChildren });
    }
    stacked = top;
  }
  return stacked;
}
