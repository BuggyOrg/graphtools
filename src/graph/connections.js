import find from 'lodash/fp/find'
import map from 'lodash/fp/map'
import curry from 'lodash/fp/curry'
import merge from 'lodash/fp/merge'
import * as Edge from '../edge'
import { edgesDeep, edges } from './edge'
import { query } from '../location'
import { node, port, hasPort, parent } from '../graph/node'
import { kind } from '../port'
import { access, store } from './internal'

const nameNode = (op, node) => {
  if (typeof (node) === 'string') return op + node
  else if (node.id) return op + node.id
  else throw new Error('Cannot access cache for invalid node query: ' + node)
}

const namePort = (op, port) => {
  if (typeof (port) === 'string') return op + port
  else if (port.node && port.port) return op + port.port + '@' + port.node
  else throw new Error('Cannot access cache for invalid port query:' + port)
}

/**
 * @function
 * @name pointsTo
 * @description Checks whether an edge points to a given target.
 * @param {Location} target The target the edge should point to. This can either be a node or a port.
 * @param {PortGraph} graph The graph
 * @param {Edge} edge The edge to check
 * @returns {boolean} True if the edge points to the target, false otherwise.
 */
export const pointsTo = curry((target, graph, edge) => {
  try {
    if (edge.to.node) {
      if (target.id) return target.id === edge.to.node
      if (typeof (target) === 'string' && target[0] === '#') return edge.to.node === target
    }
    if (typeof (edge.to) === 'string') {
      if (target.id) return target.id === edge.to
      if (typeof (target) === 'string' && target[0] === '#') return edge.to === target
    }
    var q = query(target, graph)
    if (typeof (edge.to) === 'string') {
      return q(node(edge.to, graph))
    }
    return q(merge(edge.to, {additionalInfo: node(edge.to, graph)}))
  } catch (err) {
    return false
  }
})

/**
 * @function
 * @name isFrom
 * @description Checks whether an edge is from a given source.
 * @param {Location} target The source the edge should come from. This can either be a node or a port.
 * @param {PortGraph} graph The graph
 * @param {Edge} edge The edge to check
 * @returns {boolean} True if the edge comes from the source, false otherwise.
 */
export const isFrom = curry((source, graph, edge) => {
  try {
    if (edge.from.node) {
      if (source.id) return source.id === edge.from.node
      if (typeof (source) === 'string' && source[0] === '#') return edge.from.node === source
    }
    if (typeof (edge.from) === 'string') {
      if (source.id) return source.id === edge.from
      if (typeof (source) === 'string' && source[0] === '#') return edge.from === source
    }
    var q = query(source, graph)
    if (typeof (edge.from) === 'string') {
      return q(node(edge.from, graph))
    }
    return q(merge(edge.from, {additionalInfo: node(edge.from, graph)}))
  } catch (err) {
    return false
  }
})

/**
 * Checks whether the two nodes or ports are connected via an edge.
 * @param {Location} nodeFrom The starting point of our connection.
 * @param {Location} nodeTo The target of our connection.
 * @param {PortGraph} graph The graph in which we want to find the connection.
 * @returns {boolean} True if the graph has an edge going from "nodeFrom" to "nodeTo".
 */
export function areConnected (nodeFrom, nodeTo, graph) {
  return !!find((e) => isFrom(nodeFrom, graph, e) && pointsTo(nodeTo, graph, e), edgesDeep(graph))
}

/**
 * Returns a list of predecessors for a node or a port. Each node can only have exactly one
 * predecessor for every port but this function always returns a list.
 * @param {Location} target The target to which the predecessors point.
 * @param {PortGraph} graph The graph.
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * predecessors inside the compound.
 * @returns {Port[]} A list of ports with that are predecessors of `target`
 */
export function predecessors (target, graph, config = { layers: ['dataflow'], goIntoCompounds: false }) {
  return map('from')(inIncidents(target, graph, config))
}

/**
 * Returns the predecessors for a node or a port. Each node can only have exactly one
 * predecessor for every port.
 * @param {Location} target The target to which the predecessors points.
 * @param {PortGraph} graph The graph.
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * a predecessor inside the compound.
 * @returns {Port} The preceeding port
 */
export function predecessor (target, graph, config = { layers: ['dataflow'], goIntoCompounds: false }) {
  return predecessors(target, graph, config)[0]
}

/**
 * Get the dataflow predecessor of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Port|String} source The target port as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} The ports that preceedes the node.
 */
export function predecessorPort (targetPort, graph) {
  const name = namePort('predecessorPort', targetPort)
  return access(name, graph) || store(predecessor(targetPort, graph), name, graph)
}

/**
 * Get the dataflow predecessor of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Node|String} source The target node as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} The ports that preceedes the node.
 */
export function predecessorNode (targetNode, graph) {
  const name = nameNode('predecessorNode', targetNode)
  return access(name, graph) || store(predecessor(targetNode, graph), name, graph)
}

/**
 * Get the dataflow predecessors of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Port|String} source The target port as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} A list of ports that preceedes the node.
 */
export function predecessorsPort (targetPort, graph) {
  const name = namePort('predecessorsPort', targetPort)
  return access(name, graph) || store(predecessors(targetPort, graph), name, graph)
}

/**
 * Get the dataflow predecessors of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Port|String} source The target port as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} A list of ports that preceedes the node.
 */
export function predecessorsNodePort (target, graph) {
  if (target.id) return predecessorsNode(target, graph)
  if (target.port && target.node) return predecessorsPort(target, graph)
  if (typeof (target) === 'string') {
    if (target[0] === '#') return predecessorsNode(target, graph)
    else if (target.indexOf('@') !== -1) return predecessorsPort(target, graph)
    else return predecessors(target, graph)
  }
  throw new Error('PredecessorNodePort only works for nodes or ports. Given input: ' + JSON.stringify(target))
}

/**
 * Get the dataflow predecessors of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Node|String} source The target node as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} A list of ports that preceedes the node.
 */
export function predecessorsNode (targetNode, graph) {
  const name = nameNode('predecessorsNode', targetNode)
  return access(name, graph) || store(predecessors(targetNode, graph), name, graph)
}

/**
 * Gets all ingoing incident edges to a port
 * @param {Location} target The port to which the edges are incident. This is the target node or port of each edge.
 * @param {PortGraph} graph The graph
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * ingoing edges inside the compound.
 * @returns {Edge[]} An array of all ingoing (i.e. pointsTo(port)) incident edges.
 */
export function inIncidents (target, graph, { layers = ['dataflow'], goIntoCompounds = false } = {}) {
  const filterFn = (e) => pointsTo(target, graph, e) && layers.some(l => l === e.layer) &&
      (Edge.isBetweenPorts(e) || e.layer !== 'dataflow') &&
      (e.layer !== 'dataflow' || goIntoCompounds || hasPort(target, graph) || kind(port(e.to, graph)) === 'input')
  if (layers.length === 1 && layers[0] === 'dataflow' && !goIntoCompounds) {
    const n = node(target, graph)
    if (hasPort(target, graph)) {
      const p = port(target, graph)
      if (p.node === n.id && kind(p) === 'output') {
        return edges(n).filter(filterFn)
      }
    }
    return edges(parent(n, graph) || graph).filter(filterFn)
  }
  return edgesDeep(graph).filter(filterFn)
}

/**
 * Gets the ingoing incident edge to a port. Each port can only have one ingoing edge.
 * @param {Location} target The node or port to which the edge is incident. This is the target node or port of the edge.
 * @param {PortGraph} graph The graph
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * ingoing edges inside the compound.
 * @returns {Edge} The ingoing incident edge.
 */
export function inIncident (target, graph, config = { layers: ['dataflow'], goIntoCompounds: false }) {
  return inIncidents(target, graph, config)[0]
}

/**
 * Gets all outgoing incident edges to a port. The given port or node is the source of each edge.
 * @param {Location} source The port from which the edge comes. This is the source node or port of the edge.
 * @param {PortGraph} graph The graph
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * outgoing edges inside the compound.
 * @returns {Edge[]} An array of all outgoing (i.e. isFrom(port)) incident edges.
 */
export function outIncidents (source, graph, { layers = ['dataflow'], goIntoCompounds = false } = {}) {
  const filterFn = (e) => {
    return isFrom(source, graph, e) && layers.some(l => l === e.layer) && (Edge.isBetweenPorts(e) || e.layer !== 'dataflow') &&
      (e.layer !== 'dataflow' || goIntoCompounds || hasPort(source, graph) || kind(port(e.from, graph)) === 'output')
  }
  if (layers.length === 1 && layers[0] === 'dataflow' && !goIntoCompounds) {
    const n = node(source, graph)
    if (hasPort(source, graph)) {
      const p = port(source, graph)
      if (p.node === n.id && kind(p) === 'input') {
        return edges(n).filter(filterFn)
      }
    }
    const e = edges(parent(n, graph) || graph).filter(filterFn)
    return e
  }
  return edgesDeep(graph).filter(filterFn)
}

/**
 * Get the successors of one node in the graph, optionally for a specific port.
 * @param {Location} source The source from which to follow the edges.
 * @param {PortGraph} graph The graph.
 * @param {Object} [config] Optional config object
 * @param {String[]} [config.layers=['dataflow']] Filter the edge based on the selected layers
 * @param {Boolean} [config.goIntoCompounds=false] Optional argument that activates looking for edges inside compounds.
 * If you specify a node as the location it will not go inside the node (if it is a compound) and look for
 * successors inside the compound.
 * @returns {Port[]} A list of ports that succeed the node.
 */
export function successors (source, graph, config = { layers: ['dataflow'], goIntoCompounds: false }) {
  return map('to')(outIncidents(source, graph, config))
}

/**
 * Get the dataflow successor of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Port|String} source The target port as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} A list of ports that succeed the node.
 */
export function successorsPort (targetPort, graph) {
  const name = namePort('successorsPort', targetPort)
  return access(name, graph) || store(successors(targetPort, graph), name, graph)
}

/**
 * Get the dataflow successor of a node in the graph. This method works in O(1) when the cache is initialized.
 * @param {Node|String} source The source node as an ID or a node object.
 * @param {PortGraph} graph The graph
 * @returns {Port[]} A list of ports that succeed the node.
 */
export function successorsNode (sourceNode, graph) {
  const name = nameNode('successorNode', sourceNode)
  return access(name, graph) || store(successors(sourceNode, graph), name, graph)
}

function or (fn1, fn2) {
  return (v) => fn1(v) || fn2(v)
}

/**
 * @function
 * @name incidents
 * @description All incident edges to the given input.
 * @param {Location} loc The node or port.
 * @param {PortGraph} graph The graph
 * @returns {Edge[]} An array of all incident edges to the given location.
 */
export const incidents = curry((loc, graph) => {
  return edgesDeep(graph).filter(or(isFrom(loc, graph), pointsTo(loc, graph)))
})
