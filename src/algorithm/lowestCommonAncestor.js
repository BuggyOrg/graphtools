
import curry from 'lodash/fp/curry'
import * as Graph from '../graph'
import setOps from 'set-ops'
import * as Node from '../node'
import {isPort} from '../port'
import {isInnerEdge} from '../edge'
import {predecessorsUntil} from './predecessors'

const {intersection, difference} = setOps

function ancestors (location, graph) {
  if (!Array.isArray(location)) {
    if (isPort(location)) {
      return new Set(predecessorsUntil([location], (node) => Graph.sameParents([node, location], graph), graph)
        .map((n) => Node.id(Graph.node(n, graph))))
    } else {
      return new Set(predecessorsUntil([location], (node) => Graph.sameParents([node, location], graph), graph)
          .map((n) => Node.id(Graph.node(n, graph))))
        .add(Node.id(Graph.node(location, graph)))
    }
  }
  return new Set(predecessorsUntil(location, graph)
    .concat(location
      .filter((l) => !isPort(l)))
      .map((n) => Node.id(Graph.node(n, graph))))
}

function hasOnlyOutEdgesToParent (graph) {
  return (node) => Graph.outIncidents(node, graph).filter(isInnerEdge).length === 0
}

/**
 * Find the lowest common ancestors (LCAs) of a set of locations.
 * @param {Array<Location>} locations An array of at least 2 locations for which you want the LCAs.
 * The locations can be ports or nodes or a mix of ports and nodes. If the location is a node it
 * can be part of the LCAs. If the location identifies a port the corresponding node will not be
 * part of the result. The locations must all have the exact same parent.
 * @param {Portgraph} graph The graph
 * @returns {Array<Node>} An array of nodes that represent the LCAs.
 * @throws {Error} An error is thrown if it is not possible to calculate the LCAs. This might be because:
 *  - the locations array is no array or does not have at least 2 nodes.
 *  - the corresponding nodes to the locations do not all have the same parent.
 */
export const lowestCommonAncestors = curry((locations, graph) => {
  if (!Array.isArray(locations) || locations.length < 2) {
    throw new Error('Calculation of lowest common ancestor requires at least 2 nodes.')
  }
  if (!Graph.sameParents(locations, graph)) {
    throw new Error('The lowest common ancestor can only be calculated for nodes with equal parents.')
  }
  // according to Bender et al. 2005 the lowest common ancestors of a graph are the common ancestors
  // of out-degree zero in the subgraph of the graph induced by the set of common ancestors.
  // We only look for the nodes inside the compound and not the whole graph.
  const locationAncestors = locations.map((l) => ancestors(l, graph))
  const allNodes = new Set(Graph.nodes(Graph.parent(locations[0], graph)).map(Node.id))
  const commonAncestors = locationAncestors.reduce(intersection, allNodes)
  const nonCommon = difference(allNodes, commonAncestors)
  const commonGraph = Graph.flow([...nonCommon].map((n) => Graph.removeNode(n)))(graph)
  const lcas = Graph.nodes(commonGraph)
    .filter((n) => Graph.sameParents([n.id, locations[0]], graph))
    .filter(hasOnlyOutEdgesToParent(commonGraph))
  if (lcas.length === 0) return [Graph.parent(locations[0], graph)]
  return lcas
})
