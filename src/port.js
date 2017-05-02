/**
 * Accessible via `require('@buggyorg/graphtools').Port`
 * 
 * Methods for handling ports. A port is attached to a node and connects data sources with sinks.
 * The port format is a unique identifier for the port and its node unlike the port name.
 * @module Port */

import curry from 'lodash/fp/curry'
import merge from 'lodash/fp/merge'
import _ from 'lodash'

const OUTPUT = 'output'
const INPUT = 'input'

/**
 * Checks whether a string represents a port notation. A port notation is a string that
 * contains the information about the node and the port separated by an `@`, e.g. 'nodeA@portB'
 * @params {string} port The string to check
 * @returns {boolean} True if the string represents a port notation, false otherwise.
 */
export function isPortNotation (port) {
  return typeof (port) === 'string' && port.indexOf('@') !== -1
}

function parsePortNotation (port) {
  var split = port.split('@')
  var res = {}
  res.node = split[0]
  if (split[1] === '') {
    throw new Error('Invalid port notation. Port notation does not contain a port. Parsed port: ' + port)
  } else {
    res.port = split[1]
  }
  return res
}

/**
 * Returns a normalized port object in the form `{node: <node-id>, port: <port-name>}`
 * @param port The port object in any digestable form.
 * @returns {Port} A port object.
 */
export function normalize (port) {
  if (isPortNotation(port)) {
    return assureType(parsePortNotation(port))
  } else {
    if (isPortNotation(port.port)) {
      return assureType(merge(port, {port: parsePortNotation(port.port).port}))
    }
    return assureType(port)
  }
}

function assureType (port) {
  if (!port.type) {
    return _.merge({type: 'generic'}, port)
  }
  return port
}

/**
 * Returns the node stored in the port
 * @param {Port} port The port in any form.
 * @returns {NodeID} The node of the port.
 */
export function node (port) {
  return normalize(port).node
}

/**
 * Returns the port name stored for the port.
 * @param {Port} port The port in any form.
 * @returns {string} The name of the port.
 */
export function portName (port) {
  return normalize(port).port
}

/**
 * Returns the data type of the port.
 * @param {Port} port The port
 * @returns The type of the port.
 */
export function type (port) {
  return normalize(port).type
}

/**
 * Sets the type of a port and returns a new port with this updated port.
 * @param type The type to set.
 * @param {Port} port The port
 * @returns The updated port.
 */
export function setType (type, port) {
  return merge(port, {type})
}

/**
 * Returns the kind of the port. Either output or input.
 * @param {Port} port The port
 * @returns The kind of the port. It is either 'input' or 'output'.
 */
export function kind (port) {
  return normalize(port).kind
}

/**
 * Returns whether the given port is an output port or not
 * @param {Port} port The port to check
 * @returns {boolean} True if the port is an output port, false otherwise.
 */
export function isOutputPort (port) {
  return port.kind === OUTPUT
}

/**
 * Returns whether the given port is an input port or not
 * @param {Port} port The port to check
 * @returns {boolean} True if the port is an input port, false otherwise.
 */
export function isInputPort (port) {
  return port.kind === INPUT
}

/**
 * Returns whether the given object is a port object or not.
 * @params any Any value.
 * @returns {boolean} True if the value is a port, false otherwise.
 */
export function isPort (any) {
  return (typeof (any) === 'object' && typeof (any.node) === 'string' && typeof (any.port) === 'string') ||
    typeof (any) === 'string' && isPortNotation(any)
}

function isLetter (c) {
  return /[a-zA-Z]/.test(c)
}

/**
 * Returns whether the given port is valid or not.
 * @param port The object to test.
 * @returns {boolean} True if the value is a valid port, false otherwise.
 */
export function isValid (port) {
  return typeof (port) === 'object' && port.port && (port.kind === INPUT || port.kind === OUTPUT) && port.type &&
    isLetter(port.port[0])
}

/**
 * Asserts that the given port is valid.
 * @param port The object to test.
 * @throws {Error} Error if the object is not a valid port.
 */
export function assertValid (port) {
  if (typeof (port) !== 'object') {
    throw new Error('Port is not an object, but is ' + port)
  }
  if (!port.port) {
    throw new Error('Port does not have a `port` prop')
  }
  if (!port.type) {
    throw new Error('Port does not have a `type` prop')
  }
  if (port.kind !== INPUT && port.kind !== OUTPUT) {
    throw new Error('Port `kind` prop should be "input" or "output", but was ' + port.kind)
  }
}

/**
 * Returns a string representation of the port
 * @params {Port} port The port
 * @returns {string} A string representation of the port.
 */
export function toString (port) {
  return node(port) + '@' + portName(port)
}

/**
 * @function
 * @name equal
 * @description Determines if two ports are equal
 * @param {Port} port1 One of the ports.
 * @param {Port} port2 The other port..
 * @returns {boolean} True if the ports are equal, false otherwise.
 */
export const equal = curry((port1, port2) => {
  return node(port1) === node(port2) && isomorph(port1, port2)
})

export const isomorph = curry((port1, port2) => {
  return portName(port1) === portName(port2) && (type(port1) === type(port2))
})

/**
 * @function
 * @name create
 * @description Create a new port object.
 * @param {Node|String} node A node object or the id of a valid node.
 * @param {String} port The name of the port
 * @param {String} kind 'input' or 'output'
 * @returns {Port} A valid port object.
 */
export const create = curry((node, port, kind, type = 'generic') => {
  if (typeof (node) === 'object') {
    return normalize({node: node.id, port, kind, type})
  } else {
    return normalize({node, port, kind, type})
  }
})

/**
 * @function
 * @name port
 * @description Create a proto port object that can be used as a location. It is no
 * valid port.
 * @param {Node|String} node A node object or the id of a valid node.
 * @param {String} port The name of the port
 * @returns {Port} A valid port object.
 */
export const port = curry((node, port) => {
  if (typeof (node) === 'object') {
    return normalize({node: node.id, port})
  } else {
    return normalize({node, port})
  }
})
