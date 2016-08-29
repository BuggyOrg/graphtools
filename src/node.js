/** @module Node */

import _ from 'lodash'

/**
 * A node either as an identifier, or as an object containing the property `node` as its identifier.
 * @typedef {(string|Object)} Node
 */

const OUTPUT = 'output'
const INPUT = 'input'

/**
 * Converts a compound path into its string representation. The seperate parts are divided by a '»'.
 * @param {String[]} compoundPathArr An array of node IDs reperesenting the compound path.
 * @returns {String} The string representation of the compound path.
 */
export function pathIDToString (compoundPathArr) {
  if (compoundPathArr.length === 1) return compoundPathArr[0]
  return compoundPathArr.reduce((acc, n) => acc + '»' + n, '')
}

/**
 * Converts a compound path string into its array representation. The seperate parts must be divided by a '»'.
 * @param {String} compoundPathStr A string reperesenting the compound path divded by '»'.
 * @returns {String[]} An array of node IDs representing the compound path.
 */
export function stringToPath (compoundPathStr) {
  if (compoundPathStr.indexOf('»') === -1) return [compoundPathStr]
  return compoundPathStr.split('»').slice(1)
}

/**
 * Returns whether a string represents a compound path or not.
 * @param {string} path The path string to test.
 * @returns True if the path represents a compound path, false otherwise.
 */
export function isCompoundPath (path) {
  return typeof (path) === 'string' && path[0] === '»'
}

/**
 * Convert a path representation into its normalized array form.
 * @param {string|string[]} path The path as a string or array.
 * @returns {Path} The normalized path.
 */
export function pathNormalize (path) {
  if (Array.isArray(path)) {
    return path
  } else {
    return stringToPath(path)
  }
}

/**
 * Joins two paths into one.
 * @param {Path} base The prefix of the new path
 * @param {Path} rest The postfix of the new path.
 * @returns {Path} The new path in the form `<base>»<rest>`.
 */
export function pathJoin (base, rest) {
  if (!base) return rest
  return _.concat(pathNormalize(base), pathNormalize(rest))
}

/**
 * Returns whether a path points to the root element or not.
 * @param {Path} path The path to check
 * @returns {boolean} True if the path points to the root element ('', '»' or []), false otherwise.
 */
export function isRootPath (path) {
  if (typeof (path) === 'string') {
    if (path === '') return true
    path = stringToPath(path)
  }
  return path.length === 0
}

/**
 * Returns the parent of a compound path.
 * @param {string[]|string} path The path either as a string or an array.
 * @returns {string[]|string} The parent of the path in the same format as the input.
 * @throws {Error} If the input format is invalid.
 */
export function pathParent (path) {
  if (typeof (path) === 'string') {
    return pathIDToString(pathParent(stringToPath(path)))
  } else if (Array.isArray(path)) {
    return path.slice(0, -1)
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

export function pathNode (path) {
  if (typeof (path) === 'string') {
    return pathIDToString(pathNode(stringToPath(path)))
  } else if (Array.isArray(path)) {
    return path.slice(-1)
  } else {
    throw new Error('Malformed compound path. It must either be a string or an array of node IDs. Compounds paths was: ' + JSON.stringify(path))
  }
}

/**
 * Returns the unique identifier of a node
 * @params {Node} node The node
 * @returns {string} The unique identifier of the node
 * @throws {Error} If the node value is invalid.
 */
export function id (node) {
  if (typeof (node) === 'string') {
    return node
  } else if (Array.isArray(node)) {
    return pathIDToString(node)
  } else if (node == null) {
    throw new Error('Cannot determine id of undefined node.')
  } else if (!node.id) {
    throw new Error('Malformed node. The node must either be a string that represents the id. Or it must be an object with an id field.\n Node: ' + JSON.stringify(node))
  }
  return node.id
}

/**
 * Tests whether two nodes are the same node. This tests only if their IDs are
 * the same not if both nodes contain the same information.
 * @param {Node} node1 One of the nodes to test.
 * @param {Node} node2 The other one.
 * @returns {boolean} True if they have the same id, false otherwise.
 */
export function equal (node1, node2) {
  return id(node1) === id(node2)
}

/**
 * Gets all ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A list of ports.
 */
export function ports (node) {
  return node.ports || []
}

/**
 * Gets all output ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A possibly empty list of output ports.
 */
export function outputPorts (node, ignoreCompounds = false) {
  if (!ignoreCompounds && !node.atomic) {
    return node.ports
  } else {
    return node.ports.filter((p) => p.kind === OUTPUT)
  }
}

/**
 * Gets all input ports of the node.
 * @param {Node} node The node.
 * @returns {Port[]} A possibly empty list of input ports.
 */
export function inputPorts (node, ignoreCompounds = false) {
  if (!ignoreCompounds && !node.atomic) {
    return node.ports
  } else {
    return node.ports.filter((p) => p.kind === INPUT)
  }
}

/**
 * Returns the port data for a given port.
 * @param {Node} node The node which has the port.
 * @param {String} name The name of the port.
 * @returns {Port} The port data.
 * @throws {Error} If no port with the given name exists in this node an error is thrown.
 */
export function port (node, name) {
  var port = _.find(node.ports, (p) => p.name === name)
  if (!port) {
    throw new Error('Cannot find port with name ' + name + ' in node ' + JSON.stringify(node))
  }
  return port
}

/**
 * Checks whether the node has the specific port.
 * @param {Node} node The node which has the port.
 * @param {String} name The name of the port.
 * @returns {Port} True if the port has a port with the given name, false otherwise.
 */
export function hasPort (node, name) {
  return !!_.find(node.ports, (p) => p.name === name)
}

/**
 * Checks whether the node is a reference.
 * @param {Node} node The node.
 * @returns {boolean} True if the node is a reference, false otherwise.
 */
export function isReference (node) {
  return _.has(node, 'ref') && node.id
}

/**
 * Checks whether a node is an atomic node.
 * @param {Node} node The node.
 * @returns {boolean} True if the node is an atomic node, false otherwise.
 */
export function isAtomic (node) {
  return !isReference(node) && node.atomic
}

function validPort (port) {
  return typeof (port) === 'object' && port.name && (port.kind === INPUT || port.kind === OUTPUT) && port.type
}

/**
 * Checks whether a node is in a valid format, i.e. if it has an id field and at least one port.
 * @param {Node} node The node to test.
 * @returns {boolean} True if the node is valid, false otherwise.
 */
export function isValid (node) {
  return isReference(node) ||
    (typeof (node) === 'object' && typeof (node.id) === 'string' && node.id.length > 0 &&
    ports(node).length !== 0 && _.every(ports(node), validPort))
}
