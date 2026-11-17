// "Tidy up" for the flow editor: lays the steps out as a top-down tree from the start step, each branch
// under the step it leaves from, in the order of its outputs (option 1, option 2, …). Steps the customer
// cannot reach are set apart on the side so they are easy to spot.
import { outputHandles } from './flowNodes.js'

const COLUMN = 290 // node width 250 + gap
const ROW_GAP = 70
const LOOSE_GAP = 1 // empty columns between the flow and the loose steps

const estimateHeight = (node) => {
  if (node.type === 'question') return 120 + (node.data?.options?.length || 0) * 28
  if (node.type === 'condition' || node.type === 'ai_agent') return 150
  return 110
}

/** Returns { [nodeId]: { x, y } } */
export function layoutFlow(nodes, edges) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const height = (n) => n.dimensions?.height || estimateHeight(n)
  const targetsOf = (n) => outputHandles(n)
    .map(h => edges.find(e => e.source === n.id && (e.sourceHandle || 'out') === h)?.target)
    .filter(t => t && byId.has(t))

  const children = new Map()
  const depth = new Map()
  const seen = new Set()

  // Breadth first, so a step shared by two branches sits under the closest one
  const grow = (rootId) => {
    const queue = [rootId]
    seen.add(rootId)
    depth.set(rootId, 0)
    while (queue.length) {
      const id = queue.shift()
      const kids = []
      for (const t of targetsOf(byId.get(id))) {
        if (seen.has(t)) continue
        seen.add(t)
        depth.set(t, depth.get(id) + 1)
        kids.push(t)
        queue.push(t)
      }
      children.set(id, kids)
    }
  }

  const width = (id) => {
    const kids = children.get(id) || []
    return kids.length ? kids.reduce((sum, k) => sum + width(k), 0) : 1
  }

  const column = new Map()
  const place = (id, left) => {
    const kids = children.get(id) || []
    if (!kids.length) {
      column.set(id, left)
      return
    }
    let cursor = left
    for (const k of kids) {
      place(k, cursor)
      cursor += width(k)
    }
    column.set(id, (column.get(kids[0]) + column.get(kids[kids.length - 1])) / 2)
  }

  const roots = []
  const start = nodes.find(n => n.type === 'trigger')
  if (start) { grow(start.id); roots.push(start.id) }
  const mainWidth = start ? width(start.id) : 0

  // Loose steps: a tree from each one nothing else points to, then whatever is left (loops)
  const pointedAt = new Set(edges.map(e => e.target))
  const loose = nodes.filter(n => !seen.has(n.id))
  for (const n of [...loose.filter(n => !pointedAt.has(n.id)), ...loose]) {
    if (!seen.has(n.id)) { grow(n.id); roots.push(n.id) }
  }

  let left = 0
  for (const id of roots) {
    if (id !== start?.id && left < mainWidth + LOOSE_GAP && start) left = mainWidth + LOOSE_GAP
    place(id, left)
    left += width(id)
  }

  // Each row is as tall as its tallest step (and loose trees share the rows)
  const rowHeight = []
  for (const n of nodes) {
    const d = depth.get(n.id) || 0
    rowHeight[d] = Math.max(rowHeight[d] || 0, height(n))
  }
  const rowY = []
  let y = 0
  for (let d = 0; d < rowHeight.length; d++) {
    rowY[d] = y
    y += (rowHeight[d] || 0) + ROW_GAP
  }

  const positions = {}
  for (const n of nodes) {
    positions[n.id] = { x: Math.round((column.get(n.id) || 0) * COLUMN), y: rowY[depth.get(n.id) || 0] }
  }
  return positions
}

/** Ids of the steps a customer can reach from the start step */
export function reachableFrom(nodes, edges) {
  const start = nodes.find(n => n.type === 'trigger')
  const seen = new Set()
  const queue = start ? [start.id] : []
  while (queue.length) {
    const id = queue.shift()
    if (seen.has(id)) continue
    seen.add(id)
    for (const e of edges) if (e.source === id && !seen.has(e.target)) queue.push(e.target)
  }
  return seen
}
