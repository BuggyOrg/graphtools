/**
 * @module Functional
 */

import merge from 'lodash/fp/merge'
import omit from 'lodash/fp/omit'
import pick from 'lodash/fp/pick'
import * as Node from '../node'
import { replaceNode } from '../graph/node'

/**
 * Returns the type of a lambda node.
 * @param {Node} node The node to check.
 * @returns {Type} The type of the lambda function. If the node is no lambda function it will return undefined.
 */
export function type (node) {
  if (node.componentId === 'functional/lambda') {
    return lambdaType(λ(node))
  }
}

function lambdaType (impl) {
  return {
    name: 'Function',
    data: [
      {name: 'arguments', data: implementationArguments(impl)},
      {name: 'returnValues', data: implementationReturnValues(impl)}
    ]
  }
}

export function typeArguments (type) {
  return type.data[0].data
}

export function typeReturns (type) {
  return type.data[1].data
}

export function implementation (node) {
  if (isValid(node)) {
    return node.nodes[0]
  }
}

const unID = (node) => {
  return omit(['id', 'path'], node)
}

const reID = (node, oldNode) => {
  return merge(node, pick(['id', 'path'], oldNode))
}

export function createLambda (implementation, node) {
  var ref = reID(Node.create({ref: 'λ'}), implementation)
  var lambda = Node.create(merge({
    componentId: 'functional/lambda',
    atomic: true,
    nodes: [merge(omit('path', ref), {path: [ref.id]})],
    path: [],
    edges: [],
    ports: [{port: 'fn', kind: 'output', type: lambdaType(implementation)}]
  }, omit('nodes', node || {})))
  return replaceNode(λ(lambda), reID(Node.create(unID(implementation)), implementation), lambda)
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
  return implementationArguments(λ(node))
}

function implementationArguments (impl) {
  return Node.inputPorts(impl)
    .map((p) => (p.type))
}

export function returnValues (node) {
  return implementationReturnValues(λ(node))
}

function implementationReturnValues (impl) {
  return Node.outputPorts(impl)
    .map((p) => (p.type))
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

export function createPartial () {
  return {
    componentId: 'functional/partial',
    ports: [
      {
        'port': 'inFn',
        'kind': 'input',
        'type': {
          'name': 'Function',
          'data': [
            {
              'name': 'arguments',
              'data': [
                'first',
                '...rest'
              ]
            },
            {
              'name': 'returnValues',
              'data': [
                'outType'
              ]
            }
          ]
        }
      },
      {
        'port': 'value',
        'kind': 'input',
        'type': 'first'
      },
      {
        'port': 'fn',
        'kind': 'output',
        'type': {
          'name': 'Function',
          'data': [
            {
              'name': 'arguments',
              'data': 'rest'
            },
            {
              'name': 'returnValues',
              'data': [
                'outType'
              ]
            }
          ]
        }
      }
    ],
    atomic: true
  }
}

export function createFunctionCall (outputs) {
  return {
    componentId: 'call',
    ports: [
      {port: 'fn', kind: 'input', type: 'function'}
    ].concat(outputs.map((p) => omit('node', p[0]))),
    atomic: true
  }
}
