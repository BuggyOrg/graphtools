/**
 * @module Functional
 */

import merge from 'lodash/fp/merge'
import omit from 'lodash/fp/omit'
import * as Node from '../node'

/**
 * Returns the type of a lambda node.
 * @param {Node} node The node to check.
 * @returns {Type} The type of the lambda function. If the node is no lambda function it will return undefined.
 */
export function type (node) {
  if (node.componentId === 'functional/lambda') {
    return {
      type: 'function',
      arguments: lambdaArguments(node),
      returnValues: returnValues(node)
    }
  }
}

export function implementation (node) {
  if (isValid(node)) {
    return node.nodes[0]
  }
}

const unID = (node) => {
  return omit(['id', 'path'], node)
}

export function createLambda (implementation, node) {
  const nodeTmp = merge({componentId: 'functional/lambda', nodes: [Node.create(unID(implementation))]}, omit('nodes', node || {}))
  return merge(nodeTmp, {
    atomic: true,
    ports: [{port: 'fn', kind: 'output', type: type(nodeTmp)}]
  })
}

/**
 * Creates a new lambda node that has given the implementation set as its implementation.
 * @param {Node} implementation The implementation to use for the lambda node.
 * @param {Node} lambda The lambda node in which you want to update the implementation.
 * @returns {Node} A new lambda node based on `lambda` that has the implementation given by `implementation`.
 * @throws {Error} If the node given by `lambda` is no lambda component.
 */
export function setImplementation (implementation, lambda) {
  assertValid(lambda)
  return merge(lambda, {nodes: [implementation]})
}

export function λ (node) {
  return implementation(node)
}

export function lambdaArguments (node) {
  return Node.inputPorts(λ(node))
    .map((p) => ({name: p.port, type: p.type}))
}

export function returnValues (node) {
  return Node.outputPorts(λ(node))
    .map((p) => ({name: p.port, type: p.type}))
}

export function isValid (node) {
  return !!(node.componentId === 'functional/lambda' && node.nodes.length === 1 &&
    (!node.edges || node.edges.length === 0))
}

export function assertValid (node) {
  if (!typeof (node) === 'object' || !node.componentId) {
    throw new Error('Expected lambda node but found: ' + JSON.stringify(node))
  }
  if (node.componentId !== 'functional/lambda') {
    throw new Error('Lambda node must have the componentId "functionalLambda". Got "' + node.componentId + '" for node at ' + node.path)
  }
  if (node.λ) {
    throw new Error('Lambda node must not have an implementation stored at "λ". This was changed to the nodes. Node at "' + node.path + '" is having a broken lambda implementation.')
  }
  if (!node.nodes) {
    throw new Error('Lambda nodes are required to have one child node (the lambda implementation) but found none. Inspecting Node at : "' + node.path + '"')
  }
  if (node.nodes.length !== 1) {
    throw new Error('Lambda nodes are required to have one child node (the lambda implementation) but found ' + node.nodes.length + '. Inspecting Node at : "' + node.path + '"')
  }
  if (node.edges && node.edges.length !== 0) {
    throw new Error('Lambda nodes must not have any edges between their implementation and the lambda node. Inspecting Node at : "' + node.path + '"')
  }
}