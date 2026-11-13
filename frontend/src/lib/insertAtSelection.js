export const insertAtSelection = (value, insertion, selection) => {
  const start = Math.min(Math.max(selection?.start ?? value.length, 0), value.length)
  const end = Math.min(Math.max(selection?.end ?? start, start), value.length)
  const caret = start + insertion.length

  return {
    text: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    caret,
  }
}
