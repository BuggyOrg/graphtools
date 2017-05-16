/**
 * @module Graph.internal
 * @overview
 * This methods are for internal usage. They do not check for bad inputs and can create broken graphs.
 * If you know what you are doing you can include them via `import * as GraphInternals from '@buggyorg/graphtools/graph/internal'`.
 */

import curry from 'lodash/fp/curry'
import flatten from 'lodash/fp/flatten'
import pick from 'lodash/fp/pick'
import set from 'lodash/fp/set'
import omit from 'lodash/fp/omit'
import merge from 'lodash/fp/merge'
import * as Node from '../node'
import {equal as pathEqual, isRoot, relativeTo, join} from '../compoundPath'
import {setPath as compoundSetPath, isCompound} from '../compound'
import * as changeSet from '../changeSet'
import {flowCallback} from './flow'
import {parent} from './node'

/**
 * @function
 * @name nodes
 * @description Returns a list of nodes on the root level.
 * @param {PortGraph} graph The graph.
 * @param {function} [predicate] An optional function that filters nodes. If no predicate function is given, all nodes are returned.
 * @returns {Nodes[]} A list of nodes.
 */
export const nodes = (graph) => {
  return graph.nodes || []
}

function nodesDeepRec (graph, parents) {
  return flatten(parents.map(nodesDeepInternal))
}

function nodesDeepInternal (graph) {
  return nodes(graph)
    .concat(nodesDeepRec(graph, nodes(graph)))
}

export function store (what, key, graph) {
  if (!graph.___store) initStore(graph)
  graph.___store[key] = what
  return what
}

export function access (key, graph) {
  return (graph.___store) ? graph.___store[key] : undefined
}

function initStore (graph) {
  Object.defineProperty(graph, '___store', {configurable: true, enumerable: false, value: {}})
}

export function resetStore (graph) {
  delete graph.___store
  initStore(graph)
}

/**
 * Get all nodes at all depths. It will go into every compound node and return their nodes
 * and the nodes of their compound nodes, etc.
 * @param {PortGraph} graph The graph to work on
 * @returns {Node[]} A list of nodes.
 */
export function nodesDeep (graph) {
  return access('nodesDeep', graph) || store(nodesDeepInternal(graph).concat([graph]), 'nodesDeep', graph)
}

/**
 * Returns a node that is located at a specific path in the graph.
 * @param {CompoundPath} path The path to the wanted node.
 * @param {PortGraph} graph The graph
 * @returns {Node|undefined} The node or undefined if the path does not exist.
 */
export function nodeByPath (path, graph) {
  if (!path) return
  if (isRoot(path)) return graph
  return nodeBy((n) => pathEqual(path, n.path), graph)
//  return nodeByPathRec(graph, path, path)
}

/**
 * Find a node using a predicate.
 * @param {Function} fn A function that decides for each node if it should be rejected or not
 * @param {PortGraph} graph The graph
 * @returns {Node|undefined} The first node that matches the predicate.
 */
export function nodeBy (fn, graph) {
  return nodesDeep(graph).filter(fn)[0]
}

/**
 * @function
 * @name idToPath
 * @description Returns the path that points to the node in the graph by its id. The id is preserved when moving or editing nodes.
 * The path might change. To fixate a node one can use the ID.
 * @param {string} id The id of the node
 * @param {PortGraph} graph The graph to search in
 * @returns {CompoundPath|null} The path to the node with the given ID.
 */
export const idToPath = curry((id, graph) => {
  return access('path-' + id, graph) || store(nodesDeep(graph).find((n) => n.id === id).path, 'path-' + id, graph)
  // return nodesDeep(graph).find((n) => n.id === id).path
})

function replacePortIDs (port, id, replaceId) {
  if (port.node === replaceId) return set('node', id, port)
  else return port
}

export function replaceEdgeIDs (edges, id, replaceId) {
  return edges.map((edge) => {
    if (typeof (edge.to) === 'object') {
      return set('to', replacePortIDs(edge.to, id, replaceId),
        set('from', replacePortIDs(edge.from, id, replaceId), edge))
    } else {
      return set('to', (edge.to === replaceId) ? id : edge.to,
        set('from', (edge.from === replaceId) ? id : edge.from, edge))
    }
  })
}

/**
 * @function
 * @name mergeNodes
 * @description Merges the contents of a node with the given data. This CAN destroy the structure of the
 * graph so be cautious and prefer updateNode whenever possible.
 * @param {Node} oldNode The old node that should get updated
 * @param {Object} newNode New values for the old node as an object that gets merged into the node.
 * @param {PortGraph} graph The graph
 * @param {Callback} [cb] A callback function that is called with the newly inserted node.
 * @returns {PortGraph} The new graph with the merged nodes.
 */
export const mergeNodes = curry((oldNode, newNode, graph, ...cbs) => {
  const cb = flowCallback(cbs)
  var path = idToPath(newNode.id, graph)
  if (!graph.inplace) {
    const mergeGraph = changeSet.applyChangeSet(graph,
      changeSet.updateNode(relativeTo(path, graph.path), merge(
        pick(['id', 'name', 'path'], oldNode), {edges: replaceEdgeIDs(newNode.edges || [], oldNode.id, newNode.id)})))
    return cb(nodeByPath(path, graph), mergeGraph)
  }
  console.time('merging')
  console.time('rel')
  const p = relativeTo(path, graph.path)
  console.timeEnd('rel')
  console.time('n')
  const n = Object.assign({},
    newNode,
    pick(['id', 'name', 'path'], oldNode),
    {edges: (oldNode.id === newNode.id) ? newNode.edges : replaceEdgeIDs(newNode.edges || [], oldNode.id, newNode.id)})
  console.timeEnd('n')
  const m = cb(nodeByPath(path, graph), changeSet.applyChangeSet(graph, // parent(oldNode, graph),
    changeSet.setNode(
      p,
      n
      )))
  /*const m = cb(nodeByPath(path, graph), changeSet.applyChangeSet(graph, // parent(oldNode, graph),
    changeSet.setNode(
      relativeTo(path, graph.path),
      Object.assign({},
        newNode,
        pick(['id', 'name', 'path'], oldNode),
        {edges: (oldNode.id === newNode.id) ? newNode.edges : replaceEdgeIDs(newNode.edges || [], oldNode.id, newNode.id)})
      )))*/
  console.timeEnd('merging')
  return m
})

/**
 * Updates all paths in the graph.
 * @param {PortGraph} graph The graph to update
 * @returns {PortGraph} The port graph with all valid paths.
 */
export const rePath = (graph) => {
  graph.path = graph.path || []
  return rePathRec(graph.path, graph)
}

const rePathRec = (basePath, graph) => {
  nodes(graph).forEach((n) => {
    var newPath = join(basePath, Node.id(n))
    n.path = newPath
    if (Node.hasChildren(n)) {
      rePathRec(newPath, n)
    }
  })
  return graph
}

function setPath (node, path) {
  var nodePath = join(path, Node.id(node))
  if (Node.hasChildren(node)) {
    return compoundSetPath(node, nodePath, setPath)
  }
  return merge(node, {path: nodePath})
}

export const unID = (node) => {
  return omit(['id', 'path'], node)
}

export function addNodeInternal (node, graph, path, checkNode, ...cbs) {
  const cb = flowCallback(cbs)
  var newNode
  if (isCompound(node)) {
    newNode = setPath(Node.create(unID(node)), path)
  } else {
    newNode = setPath(Node.create(unID(node)), path)
  }
  checkNode(graph, newNode)
  if (Node.hasChildren(newNode)) {
    newNode = set('edges', replaceEdgeIDs(newNode.edges, newNode.id, node.id), newNode)
  }
  return cb(newNode, changeSet.applyChangeSet(graph, changeSet.insertNode(newNode, path)))
}
