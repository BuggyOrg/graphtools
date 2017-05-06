
import flatten from 'lodash/fp/flatten'
import uniq from 'lodash/fp/uniq'
import * as Graph from '../graph'
import * as Node from '../node'

/**
 * Return all predecessors of a node or port, until a given subset.
 * @param {Location|Array<Location>} node Look for predecessors of this location(s).
 * @param {Predicate} predicate A predicate function (Node -> Boolean) that decides whether a node should
 * be included in the predecessor chain (true) or if it should be left out (false).
 * @param {Portgraph} graph The graph
 * @returns {Array<Node>} The nodes between the input node and `other` without both inputs.
 */

export function predecessorsUntil (locs, predicate, graph) {
  if (!Array.isArray(locs)) return predecessorsUntil([locs], predicate, graph)
  if (locs.length === 0) return []
  const preds = flatten(locs.map((l) => Graph.predecessorsNodePort(l, graph)))
    .map((n) => Graph.node(n, graph))
    .filter(predicate)
  return uniq(preds.concat(predecessorsUntil(preds, predicate, graph)))
}

/**
 * Return all predecessors of a node or port, until a given subset.
 * @param {Location|Array<Location>} node Look for predecessors of this location(s).
 * @param {Node|Array<Node>} other A node or an array of node indicating where to stop
 * @param {Portgraph} graph The graph
 * @returns {Array<Node>} The nodes between the input node and `other` without both inputs.
 */
export function predecessorsUpTo (locs, other, graph) {
  if (!Array.isArray(other)) return predecessorsUpTo(locs, [other], graph)
  return predecessorsUntil(locs, (n) => !other.some(Node.equal(n)), graph)
}

/**
 * Return all predecessors of a node or port.
 * @param {Location|Array<Location>} node Look for predecessors of this location(s).
 * @param {Portgraph} graph The graph
 * @returns {Array<Node>} The preceeding nodes between of the input node (without the input node).
 */
export const predecessors = (locs, graph) => predecessorsUntil(locs, () => true, graph)
