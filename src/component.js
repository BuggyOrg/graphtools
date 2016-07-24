/** @module node */

import _ from 'lodash'

/**
 * A node either as an identifier, or as an object containing the property `node` as its identifier.
 * @typedef {(string|Object)} Node
 */

const OUTPUT = 'output'
const INPUT = 'input'

/**
 * Returns the unique identifier of a node
 * @params {Component} node The node
 * @returns {string} The unique identifier of the node
 * @throws {Error} If the node value is invalid.
 */
export function id (component) {
  if (typeof (component) === 'string') {
    return component
  } else if (component == null) {
    throw new Error('Cannot determine id of undefined component.')
  } else if (!component.meta) {
    throw new Error('Malformed component. The component must either be a string that represents the id. Or it must be an object with an id field.\n Component: ' + JSON.stringify(component))
  }
  return component.meta
}

/**
 * Tests whether two components are the same component. This tests only if their meta IDs are
 * the same not if both components contain the same information.
 * @param {Component} comp1 One of the components to test.
 * @param {Component} comp2 The other one.
 * @returns {boolean} True if they have the same id, false otherwise.
 */
export function equal (comp1, comp2) {
  return id(comp1) === id(comp2)
}

/**
 * Gets all ports of the component.
 * @param {Component} comp The component.
 * @returns {Port[]} A list of ports.
 */
export function ports (comp) {
  return comp.ports || []
}

/**
 * Gets all output ports of the comp.
 * @param {Component} comp The node.
 * @returns {Port[]} A possibly empty list of output ports.
 */
export function outputPorts (comp, ignoreCompounds = false) {
  if (!ignoreCompounds && !comp.atomic) {
    return comp.ports
  } else {
    return comp.ports.filter((p) => p.kind === OUTPUT)
  }
}

/**
 * Gets all input ports of the component.
 * @param {Component} comp The component.
 * @returns {Port[]} A possibly empty list of input ports.
 */
export function inputPorts (comp, ignoreCompounds = false) {
  if (!ignoreCompounds && !comp.atomic) {
    return comp.ports
  } else {
    return comp.ports.filter((p) => p.kind === INPUT)
  }
}

/**
 * Returns the port data for a given port.
 * @param {Component} comp The component which has the port.
 * @param {String} name The name of the port.
 * @returns {Port} The port data.
 * @throws {Error} If no port with the given name exists in this component an error is thrown.
 */
export function port (comp, name) {
  var port = _.find(comp.ports, (p) => p.name === name)
  if (!port) {
    throw new Error('Cannot find port with name ' + name + ' in component ' + JSON.stringify(comp))
  }
  return port
}

/**
 * Checks whether the component has the specific port.
 * @param {Component} comp The component which has the port.
 * @param {String} name The name of the port.
 * @returns {Port} True if the port has a port with the given name, false otherwise.
 */
export function hasPort (comp, name) {
  return !!_.find(comp.ports, (p) => p.name === name)
}

/**
 * Checks whether a component is in a valid format, i.e. if it has an id field and at least one port.
 * @param {Component} comp The component to test.
 * @returns {boolean} True if the component is valid, false otherwise.
 */
export function isValid (comp) {
  return typeof (comp) === 'object' && typeof (comp.meta) === 'string' && comp.meta.length > 0 &&
    ports(comp).length !== 0
}

/**
 * Create a node from a component.
 * @param {string} name The name of the new node.
 * @param {Component} comp The component that is the basis for the new node.
 * @returns {Node} A node with the given name representing the component.
 */
export function createNode (name, comp) {
  return _.merge({id: name}, comp)
}
