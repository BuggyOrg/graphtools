/**
 * Accessible via `require('@buggyorg/graphtools').Algorithm`
 *
 * A collection of algorithms that act on the port graph.
 * @module Algorithm
 */

import * as Graph from '../graph'
import {debug} from '../debug'

/**
 * Returns a topological sorting of the graph.
 * @param {Node} compound A compound node to perform the topological sort in. The sorting is only
 * considering nodes directly inside the compound. It does not go into further compounds.
 * @param {PortGraph} graph The graph.
 * @return {Node[]} A sorting of the nodes given as an array of nodes.
 * @throws {Error} If the graph has loops.
 */
export default function topologicalSort (compound, graph) {
  // be backwards compatible
  if (!graph) graph = compound
  // Calculate predecessor counts
  const predecessorCount = {}
  const nodes = Graph.nodes(compound)
  for (const node of nodes) {
    predecessorCount[node.id] = 0
  }
  for (const node of nodes) {
    for (const successor of Graph.successorsNode(node, graph)) {
      if (successor.node !== compound.id) {
        predecessorCount[successor.node]++
      }
    }
  }

  const topologicalSorted = []
  // while the predecessor list is not empty, search an element with a predecessor count of 0
  while (Object.keys(predecessorCount).length > 0) {
    let nextElement = null
    for (const e of Object.keys(predecessorCount)) {
      if (predecessorCount[e] === 0) {
        nextElement = e
        break
      }
    }

    // if there is no such element, topological sorting is not possible because there are cycles
    if (nextElement == null) {
      debug(compound, true)
      throw new Error('Found cycle in the graph. Impossible to calculate topological sorting.')
    }

    // return that node and remove it from the predecessor list
    topologicalSorted.push(Graph.node(nextElement, graph))
    delete predecessorCount[nextElement]

    // decrease the predecessor count of every successor of that node
    // this may produce new nodes with a predecessour count of 0
    for (const successor of Graph.successorsNode(nextElement, graph)) {
      if (successor.node !== compound.id) {
        predecessorCount[successor.node]--
      }
    }
  }

  return topologicalSorted
}
