/** @module Node */

import curry from 'lodash/fp/curry'
import merge from 'lodash/fp/merge'
import find from 'lodash/fp/find'
import has from 'lodash/fp/has'
import every from 'lodash/fp/every'
import * as Port from './port'
import cuid from 'cuid'
import {node as pathNode, isCompoundPath, equal as pathEqual, parent} from './compoundPath'

/**
 * A node either as an identifier, or as an object containing the property `node` as its identifier.
 * @typedef {(string|Object)} Node
 */

/**
 * Creates a normalized node object. It makes sure, that the node has all necessary information like an id and a
 * normalized path.
 * @param {Node} node A protypical node object.
 * @returns {Node} A complete node object
 */
export function create (node) {
  if (node.id) {
    throw new Error('You cannot explicitly assign an id for a node. Use the name field for node addressing')
  }
  var newNode = merge(node, {id: '#' + cuid(), settings: merge({}, node.settings), ports: (node.ports) ? node.ports.map(Port.normalize) : []})
  if (!isReference(newNode) && !isValid(newNode)) {
    throw new Error('Cannot create invalid node: ' + JSON.stringify(node))
  }
  return newNode
}

/**
 * Checks if the given object is an id.
 * @param obj The object to test
 * @returns {boolean} True if the object is an id, false otherwise.
 */
export function isID (str) {
  return typeof (str) === 'string' && (str[0] === '#')
}

/**
 * Returns the unique identifier of a node. The id is unique for the whole graph and cannot be assigned twice.
 * @params {Node} node The node
 * @returns {string} The unique identifier of the node
 * @throws {Error} If the node value is invalid.
 */
export function id (node) {
  if (typeof (node) === 'string') {
    return node
  } else if (node == null) {
    throw new Error('Cannot determine id of undefined node.')
  }
  return node.id
}

/**
 * Gets the name of a node. The name is a unique identifier in respect to the parent. Each graph
 * can have only one node with a specific name as its direct child. If a node has no name, the
 * id is the name of the node.
 * @params {Node} node The node
 * @returns {string} The name of the node.
 */
export function name (node) {
  if (typeof (node) === 'string') {
    return node
  } else if (node.name) {
    return node.name
  } else if (isCompoundPath(node)) {
    return pathNode(node)[0]
  } else {
    return node.id
  }
}

export function hasName (node) {
  return !!node.name
}

export function hasPath (node) {
  return !!node.path
}

export function hasID (node) {
  return !!node.id
}

export function hasChildren (node) {
  return !get('hideChildren', node) && Array.isArray(node.nodes)
}

/**
 * Tests whether two nodes are the same node. This tests only if their IDs are
 * the same not if both nodes contain the same information.
 * @param {Node} node1 One of the nodes to test.
 * @param {Node} node2 The other one.
 * @returns {boolean} True if they have the same id, false otherwise.
 */
export const equal = curry((node1, node2) => {
  if (((isValid(node1) && (hasID(node1) || !isReference(node1))) || isID(node1)) &&
      ((isValid(node2) && (hasID(node2) || !isReference(node2))) || isID(node2))) {
    return id(node1) && id(node2) && id(node1) === id(node2)
  } else if (Port.isPort(node1)) {
    return equal(Port.node(node1), node2)
  } else if (Port.isPort(node2)) {
    return equal(node1, Port.node(node2))
  } else if (hasPath(node1) && hasPath(node2)) {
    return pathEqual(parent(node1), parent(node2)) && name(node1) === name(node2)
  } else {
    return name(node1) === name(node2)
  }
})

/**
 * Gets all ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A list of ports.
 */
export function ports (node) {
  return node.ports.map(merge({node: node.id})) || []
}

/**
 * Gets all output ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A possibly empty list of output ports.
 */
export function outputPorts (node, ignoreCompounds = false) {
  if (!ignoreCompounds && !node.atomic) {
    return ports(node)
  } else {
    return ports(node).filter(Port.isOutputPort)
  }
}

/**
 * Gets all input ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A possibly empty list of input ports.
 */
export function inputPorts (node, ignoreCompounds = false) {
  if (!ignoreCompounds && !node.atomic) {
    return ports(node)
  } else {
    return ports(node).filter(Port.isInputPort)
  }
}

/**
 * Returns the port data for a given port.
 * @param {Node} node The node which has the port.
 * @param {String|Port} name The name of the port or a port object.
 * @returns {Port} The port data.
 * @throws {Error} If no port with the given name exists in this node an error is thrown.
 */
export const port = curry((name, node) => {
  if (Port.isPort(name)) {
    return port(Port.portName(name), node)
  }
  var curPort = find((p) => Port.portName(p) === name, node.ports)
  if (!curPort) {
    throw new Error('Cannot find port with name ' + name + ' in node ' + JSON.stringify(node))
  }
  return curPort
})

export function path (node) {
  if (!node) return []
  return node.path
}

/**
 * Checks whether the node has the specific port.
 * @param {Node} node The node which has the port.
 * @param {String|Port} name The name of the port or a port object.
 * @returns {Port} True if the port has a port with the given name, false otherwise.
 */
export const hasPort = curry((name, node) => {
  if (Port.isPort(name)) {
    return hasPort(Port.portName(name), node)
  }
  return !!find((p) => Port.portName(p) === name, node.ports)
})

/**
 * Checks whether the node is a reference.
 * @param {Node} node The node.
 * @returns {boolean} True if the node is a reference, false otherwise.
 */
export function isReference (node) {
  return has('ref', node)
}

export function component (node) {
  return node.componentId
}

export const set = curry((value, node) => {
  return merge(node, {settings: merge(node.settings, value)})
})

export const get = curry((key, node) => (node.settings) ? node.settings[key] : node.settings)

/**
 * Checks whether a node is an atomic node.
 * @param {Node} node The node.
 * @returns {boolean} True if the node is an atomic node, false otherwise.
 */
export function isAtomic (node) {
  return !isReference(node)
}

/**
 * Checks whether a node is in a valid format, i.e. if it has an id field and at least one port.
 * @param {Node} node The node to test.
 * @returns {boolean} True if the node is valid, false otherwise.
 */
export function isValid (node) {
  return isReference(node) ||
    (typeof (node) === 'object' && typeof (node.id) === 'string' && node.id.length > 0 &&
    every(Port.isValid, ports(node)))
}
