/** @module Compound */

import omit from 'lodash/fp/omit'
import merge from 'lodash/fp/merge'
import curry from 'lodash/fp/curry'
import * as Node from './node'
import * as Edge from './edge'
import * as Port from './port'
import {edgesDeep, removeEdge} from './graph/edge'
import {pointsTo, isFrom, predecessor} from './graph/connections'
import {nodes, node} from './graph/node'
import _ from 'lodash'
import cuid from 'cuid'

/**
 * Checks whether a node is a compound node.
 * @param {Node} node The node.
 * @returns {boolean} True if the node is a compound node, false otherwise.
 */
export function isCompound (node) {
  return !Node.isReference(node) && !node.atomic && !!node.nodes && !!node.edges
}

/**
 * Returns whether the node is a recursion node
 * (i.e. is the node that contains the recursion implementation -- recursive root
 * or it is the the node that invokes the recursive call -- recursion invokee)
 * @params {Node} node The node that should be tested
 * @returns {boolean} True if it is a recursion node, false otherwise.
 */
export function isRecursion (node) {
  // might change in the future...
  return node.isRecursion
}

/**
 * Returns the id of the compound
 * @param {Compound} node The compound node
 * @returns {String} The id of the compound.
 */
export function id (node) {
  if (node.id) {
    return Node.id(node)
  } else return null
}

/**
 * Sets the compound path of the compound node.
 * @param {Compound} node The compound node that gets a new compound path.
 * @param {CompoundPath} path The new compound path.
 * @param {function} nodeSetPath A function that sets the path for a node.
 * @returns {Compound} The new compound with updated paths.
 */
export function setPath (node, path, nodeSetPath) {
  return _.merge({}, node,
    {path},
    // I think `nodeSetPath` is only used due to the fear of importing ./node.js here and ./compound.js in ./node.js (cyclic reference...)
    {nodes: node.nodes.map((n) => nodeSetPath(n, path))},
    {edges: (node.edges || []).map((e) => Edge.setPath(e, path))}
  )
}

const newID = (process.env.NODE_IDS) ? (() => { var cnt = 0; return () => 'comp_' + cnt++ })() : cuid

/**
 * Create a new compound either with a template, or an empty one.
 * @params {Node} node An optional node template that contains the name and ports of the compound.
 * @returns {Compound} The compound representing the given node.
 */
export function create (node) {
  node = node || {}
  if (node.edges && node.edges.length > 0 || (node.nodes && node.nodes.length > 0)) throw new Error('createCompound can only create new compounds without edges and sub nodes.')
  return _.merge({
    nodes: [],
    metaInformation: {},
    edges: [],
    components: [],
    path: [],
    ports: [],
    atomic: false,
    id: '#' + newID()
  }, node)
}

/**
 * @function
 * @name children
 * @description Get the children of the compound node.
 * @param {Compound} node The compound node
 * @returns {Node[]} An array of child nodes.
 */
export const children = nodes
export const hasPort = Node.hasPort
export const inputPorts = Node.inputPorts
export const outputPorts = Node.outputPorts
export const component = Node.component

const getPort = (portOrString, node) =>
  (typeof (portOrString) === 'string') ? Port.create(node, portOrString, null) : merge({node: node.id}, portOrString)

/**
 * @function
 * @name renamePort
 * @description Rename a port and return the new node.
 * @param {String|Port} port the Port to rename.
 * @returns {Node} The node with the renamed port. The componentId will be removed, as it is not
 * an implementation of the component anymore.
 */
export const renamePort = curry((port, newName, node) => {
  port = getPort(port, node)
  return omit('componentId', merge(node, {ports: node.ports.map((p) => {
    if (port.port === p.port) {
      return merge(p, {port: newName})
    } else return p
  })}))
})

/**
 * @function
 * @name removePort
 * @description Remove a port from a node
 * @param {Port|String} port The port to remove
 * @returns {Node} The node without the given port. The componentId will be removed, as it is not
 * an implementation of the component anymore.
 */
export const removePort = curry((port, node) => {
  port = getPort(port, node)
  // var portEdges = edgesDeep(node).filter((e) => (pointsTo(port, node, e) || isFrom(port, node, e)))
  var portEdges = edgesDeep(node).filter((e) => Edge.isBetweenPorts(e) && (pointsTo(port, node, e) || isFrom(port, node, e)))
  var newNode = portEdges.reduce((cmp, edge) => removeEdge(edge, cmp), node)
  return merge(omit(['ports', 'componentId'], newNode),
    {ports: Node.ports(newNode).filter((p) => port.port !== p.port)})
})

const addPort = (port, kind, node) => {
  if (hasPort(port, node)) {
    throw new Error('Cannot add already existing port ' + Port.toString(port) + ' to node.')
  }
  if (port.type) {
    return omit('componentId',
      merge(node, {ports: node.ports.concat([Port.create(node.id, port.port, kind, port.type)])}))
  } else {
    return omit('componentId',
      merge(node, {ports: node.ports.concat([Port.create(node.id, port.port, kind)])}))
  }
}

/**
 * @function
 * @name addInputPort
 * @description Adds a new input port to the node.
 * @params {Port|String} port The port to add.
 * @params {Node} node The node that gets the port.
 * @returns {Node} A new node with the given port.
 * @throws {Error} If the node already has a port with that name.
 */
export const addInputPort = curry((port, node) => {
  port = getPort(port, node)
  return addPort(port, 'input', node)
})

/**
 * @function
 * @name addOutputPort
 * @description Adds a new output port to the node.
 * @params {Port|String} port The port to add.
 * @params {Node} node The node that gets the port.
 * @returns {Node} A new node with the given port.
 * @throws {Error} If the node already has a port with that name.
 */
export const addOutputPort = curry((port, node) => {
  port = getPort(port, node)
  return addPort(port, 'output', node)
})

function checkStructureEquality (compound1, compound2) {
  if (!Node.inputPorts(compound1).every((p) => Node.hasInputPort(p, compound2))) {
    return false
  }
  if (!Node.outputPorts(compound1).every((p) => Node.hasOutputPort(p, compound2))) {
    return false
  }
  if (nodes(compound1).length !== nodes(compound2).length) return false
  // check from the output ports to the input ports. Every node must have the same ports
  // in the same order and each input port has exactly one predecessor. Thus it is unambiguous
  // if we follow the edges backwards through the compound node checking recursively for
  // isomorphy for each child node.
  var q1 = []
  var q2 = []
  Node.outputPorts(compound1).map((p) => q1.push(predecessor(p, compound1)))
  Node.outputPorts(compound2).map((p) => q2.push(predecessor(p, compound2)))
  while (q1.length !== 0 && q2.length !== 0) {
    const p1 = q1.shift()
    const p2 = q2.shift()
    if (typeof (p1) === 'undefined' && typeof (p2) === 'undefined') continue
    if (typeof (p1) === 'undefined' || typeof (p2) === 'undefined') return false
    if (!Port.isomorph(p1, p2)) return false
    const cur1 = node(p1, compound1)
    const cur2 = node(p2, compound2)
    if (Node.equal(cur1, compound1) && Node.equal(cur2, compound2)) continue
    if (!isomorph(cur1, cur2)) return false
    Node.inputPorts(cur1).map((p) => q1.push(predecessor(p, compound1)))
    Node.inputPorts(cur2).map((p) => q2.push(predecessor(p, compound2)))
  }
  // both queues must be empty
  return (q1.length === 0 && q2.length === 0)
}

/**
 * Tests whether two graphs are isomorph (strutucally equal). IDs and paths might differ.
 * @param {Portgraph} graph1 One of the graphs
 * @param {Portgraph} graph2 The other one of the graphs
 * @returns {Boolean} True if the graphs are stucturally equal, false otherwise.
 */
export function isomorph (graph1, graph2) {
  if (!isCompound(graph1) === isCompound(graph2)) return false
  if (isCompound(graph1)) {
    if (!checkStructureEquality(graph1, graph2)) return false
  }
  return Node.isomorph(graph1, graph2) // componentId, ports
}
