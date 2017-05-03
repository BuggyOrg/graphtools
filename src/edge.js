/**
 * Accessible via `require('@buggyorg/graphtools').Edge`
 * @module Edge */

import curry from 'lodash/fp/curry'
import merge from 'lodash/fp/merge'
import _ from 'lodash'
import * as Port from './port'
import * as Node from './node'

function normalizeStructure (edge) {
  if (!_.has(edge, 'from') || !_.has(edge, 'to')) {
    throw new Error('The edge format is not valid. You need to have a from and to value in.\n\n' + JSON.stringify(edge, null, 2) + '\n')
  }
  var layer = edge.layer || 'dataflow'
  if (layer !== 'dataflow') {
    var newEdge = _.clone(edge)
    if (Node.isValid(edge.from)) {
      newEdge.from = Node.id(edge.from)
    }
    if (Node.isValid(edge.to)) {
      newEdge.to = Node.id(edge.to)
    }
    return newEdge
  }
  if ((typeof (edge.from) === 'string' && edge.from[0] === '/') ||
    (typeof (edge.to) === 'string' && edge.to[0] === '/')) {
    return merge(edge, {query: true,
        from: (Port.isPort(edge.from)) ? Port.normalize(edge.from) : edge.from,
        to: (Port.isPort(edge.to)) ? Port.normalize(edge.to) : edge.to
      })
  } if (edge.outPort && edge.inPort) {
    return _.merge({}, _.omit(edge, ['outPort', 'inPort']),
      {layer, from: Port.normalize({node: edge.from, port: edge.outPort}), to: Port.normalize({node: edge.to, port: edge.inPort})})
  } else if (!edge.outPort && !edge.inPort && Port.isPort(edge.from) && Port.isPort(edge.to)) {
    return { from: Port.normalize(edge.from), to: Port.normalize(edge.to), layer }
  } else {
    throw new Error('Malformed edge. Cannot translate format into standard format.\nEdge: ' + JSON.stringify(edge))
  }
}

/**
 * Normalizes the edge into the standard format
 *
 * ```
 *  {from: '<port>', to: '<port>'}
 * ```
 *
 * It accepts the following short forms:
 *
 * ```
 *  {from: '<node>@<port>', to: '<node>@<port>'}
 *  {from: '@<port>', to: '<node>@<port>'}
 *  {from: '<node>@<port>', to: '@<port>'}
 *  {from: '@<port>', to: '@<port>'}
 *  {from: '<node>', to: '<node>', outPort: '<port-name>', inPort: '<port-name>'}
 * ```
 *
 * The format must be consistent, you cannot have a mixture for `from` and `to`.
 * It is not possible to always add those normalized edges into the graph. They must contain
 * valid IDs of the graph. Use `Graph.normalize` for this.
 *
 * @param {Edge} edge The edge object that should be normalized.
 * @returns {Edge} The normalized form of the edge.
 * @throws {Error} An error is thrown if the edge is not in a consistent format.
 */
export function normalize (edge) {
  var newEdge = normalizeStructure(edge)
  if (typeof (newEdge.from) === 'object' && newEdge.from.node.length === 0) {
    newEdge.innerCompoundOutput = true
  }
  if (typeof (newEdge.to) === 'object' && newEdge.to.node.length === 0) {
    newEdge.innerCompoundInput = true
  }
  return newEdge
}

export function isEdgeToParent (edge) {
  return edge.innerCompoundInput
}

export function isInnerEdge (edge) {
  return !edge.innerCompoundInput && !edge.innerCompoundOutput
}

export function isEdgeFromParent (edge) {
  return edge.innerCompoundOutput
}

/**
 * @function
 * @name equal
 * @description Checks whether two normalized edges are equal.
 * @param {Edge} edge1 The first edge for the comparison.
 * @param {Edge} edge2 The second edge for the comparison.
 * @returns {boolean} True if the edges are equal (i.e. they connect the same ports), false otherwise.
 */
export const equal = curry((edge1, edge2) => {
  if (edge1.layer === 'dataflow') {
    return Port.node(edge1.from) === Port.node(edge2.from) && Port.node(edge1.to) === Port.node(edge2.to) &&
      Port.portName(edge1.from) === Port.portName(edge2.from) && Port.portName(edge1.to) === Port.portName(edge2.to) &&
      edge1.layer === edge2.layer
  } else {
    return edge1.from === edge2.from && edge1.to === edge2.to && edge1.layer === edge2.layer
  }
})

/**
 * Returns a copy of the edge where the path is prefixed with the specified path. [Does nothing currently... can probably be removed. Is used in ./compound.js]
 * @param {Edge} edge The edge that will be prefixed
 * @param {CompoundPath} path The compound path that prefixes the edge paths.
 * @returns {Edge} A new edge that has the prefixed paths.
 */
export function setPath (edge, path) {
  return edge
}

/**
 * Gets the type of an edge. Note that not every edge must have a type and that the type is not stored inside the json document.
 * If you use the graph functions to iterate over edges you always get the type (if available) with the edge.
 * @example <caption>Get an edge via a graph method and then get its edge.</caption>
 * var edge = Graph.incident(port, graph)
 * var type = Edge.type(edge)
 * @example <caption>It will yield undefined if you simply access an edge in the json document, do not do that.</caption>
 * var edge = graph.edges[0]
 * //this will return undefined
 * var type = Edge.type(edge) // = undefined
 * @param {Edge} edge The edge to use.
 * @returns {Type|undefined} Either a real type, a typename or `undefined`. Some edges do not have type information. Usually non-dataflow edges like
 * recursion indicators. Those will yield `undefined`.
 */
export function type (edge) {
  return edge.type
}

/**
 * Explicitly sets the type of the edge. The type of an edge is determined by the connecting ports.
 * @param {Type} type The type of the edge.
 * @param {Edge} edge The edge that should get the type.
 * @returns {Edge} A new edge that has a field for the type.
 */
export function setType (type, edge) {
  if (isBetweenPorts(edge)) {
    return merge(edge, {type, from: Port.setType(type, edge.from), to: Port.setType(type, edge.to)})
  } else if (!isBetweenNodes(edge)) {
    throw new Error('[Edge.setType] Cannot handle mixed edges (from port to node or from node into port)')
  }
  return merge({type}, edge)
}


/**
 * Checks whether an object is a valid edge.
 * @param {Object} edge The object to test.
 * @returns {Boolean} True if the object is an edge, false otherwise.
 */
export function isValid (edge) {
  return typeof (edge) === 'object' && edge.from && edge.to
}

/**
 * Checks if the edge connects two ports.
 * @param {Edge} edge The edge to test
 * @returns {Boolean} True if the edge connects two ports, false otherwise.
 */
export function isBetweenPorts (edge) {
  return typeof (edge) === 'object' &&
    typeof (edge.from) === 'object' && edge.from.port &&
    typeof (edge.to) === 'object' && edge.to.port
}

/**
 * Checks if the edge connects two nodes (and not ports of those nodes).
 * @param {Edge} edge The edge to test
 * @returns {Boolean} True if the edge connects two nodes, false otherwise (e.g. if it is an edge between ports).
 */
export function isBetweenNodes (edge) {
  return isValid(edge) && !isBetweenPorts(edge)
}
