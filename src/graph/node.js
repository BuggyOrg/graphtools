
import curry from 'lodash/fp/curry'
import merge from 'lodash/fp/merge'
import omit from 'lodash/fp/omit'
import {isRoot, rest as pathRest, base as pathBase, parent as pathParent, relativeTo, equal} from '../compoundPath'
import {normalize as normalizePort, portName} from '../port'
import * as Node from '../node'
import * as changeSet from '../changeSet'
import {assertGraph} from '../assert'
import {flow, flowCallback, Let, sequential} from './flow'
import {nodeBy, mergeNodes, rePath, addNodeInternal, unID, nodesDeep} from './internal'
import {query, toString} from '../location'
import {incidents} from './connections'
import {createNode} from '../component'
import {removeEdge, realizeEdgesForNode} from './edge'

/**
 * @function
 * @name nodes
 * @description Returns a list of nodes on the root level.
 * @param {PortGraph} graph The graph.
 * @returns {Nodes[]} A list of nodes.
 */
export const nodes = (graph) => {
  return graph.nodes || []
}

/**
 * @function
 * @name nodesBy
 * @description Returns a list of nodes on the root level selected by a given predicate.
 * @param {function|Location} predicate A function that filters nodes. Or alternatively you can use a location query.
 * @param {PortGraph} graph The graph.
 * @returns {Nodes[]} A list of nodes.
 * @example <caption>Select by function</caption>
 * // all nodes that have the name select
 * nodesBy((node) => node.name === 'select', graph)
 * @example <caption>Select by location query</caption>
 * // selects all if components in the current layer.
 * nodesBy('/if', graph)
 */
export const nodesBy = curry((predicate, graph) => {
  if (typeof (predicate) !== 'function') {
    return nodes(graph).filter(query(predicate, graph))
  }
  return nodes(graph).filter(predicate)
})

/**
 * Get all nodes at all depths. It will go into every compound node / lambda node and return their nodes
 * and the nodes of their compound nodes, etc.
 * @param {PortGraph} graph The graph to work on
 * @returns {Node[]} A list of nodes.
 */
export {nodesDeep}

/**
 * @function
 * @name nodesDeepBy
 * @description Get all nodes at all depths that fulfill the given predicate. It will go into every compound node
 * and return their nodes and the nodes of their compound nodes, etc.
 * @param {function|Location} predicate A function that filters nodes. Or alternatively you can use a location query.
 * @param {PortGraph} graph The graph to work on
 * @returns {Node[]} A list of nodes that fulfill the predicate.
 */
export const nodesDeepBy = curry((predicate, graph) => {
  if (typeof (predicate) !== 'function') {
    return nodesDeep(graph).filter(query(predicate, graph))
  }
  return nodesDeep(graph).filter(predicate)
})

/**
 * Returns a list of node names. [Performance O(|V|)]
 * @param {PortGraph} graph The graph.
 * @returns {string[]} A list of node names.
 */
export function nodeNames (graph) {
  return nodes(graph).map(Node.id)
}

/**
 * @function
 * @name node
 * @description Returns the node at the given location. [Performance O(|V|)]
 * @param {Location} loc A location identifying the node.
 * @param {PortGraph} graph The graph.
 * @returns {Node} The node in the graph
 * @throws {Error} If the queried node does not exist in the graph.
 */
export const node = curry((loc, graph) => {
  try {
    var node = nodeBy(query(loc, graph), graph)
  } catch (err) {
    throw new Error(`Node: '${Node.id(loc) || JSON.stringify(loc)}' does not exist in the graph.`)
  }
  if (!node) {
    throw new Error(`Node: '${Node.id(loc) || JSON.stringify(loc)}' does not exist in the graph.`)
  }
  return node
})

/**
 * @function
 * @name port
 * @description Returns a port specified by the short notation or a port query object. [Performance O(|V|)]
 * @param {Port} port A port object or a short notation for a port.
 * @param {PortGraph} graph The graph.
 * @returns {Node} The actual port object with type information.
 * @throws {Error} If the queried port does not exist in the graph.
 */
export const port = curry((port, graph) => {
  var nodeObj = node(port, graph)
  return Node.port(normalizePort(port), nodeObj)
})

export const hasPort = curry((port, graph) => {
  if (!hasNode(port, graph)) return false
  var nodeObj = node(port, graph)
  return Node.hasPort(normalizePort(port), nodeObj)
})

/**
 * @function
 * @name hasNode
 * @description Checks whether the graph has a node. [Performance O(|V|)]
 * @param {Location} loc A location identifying the node
 * @param {PortGraph} graph The graph.
 * @returns {boolean} True if the graph has a node with the given id, false otherwise.
 */
export const hasNode = curry((loc, graph) => {
  return !!nodeBy(query(loc, graph), graph)
})

export function checkNode (graph, nodeToCheck) {
  if (hasNode(unID(nodeToCheck), graph) && !equal(node(unID(nodeToCheck), graph).path, graph.path) && !Node.equal(nodeToCheck, graph)) {
    throw new Error('Cannot add already existing node: ' + Node.name(nodeToCheck))
  }
  if (!nodeToCheck) {
    throw new Error('Cannot add undefined node to graph.')
  } else if (!Node.isValid(nodeToCheck)) {
    throw new Error('Cannot add invalid node to graph. Are you missing the id or a port?\nNode: ' + JSON.stringify(nodeToCheck))
  } else {
    if (Node.hasName(nodeToCheck) && hasNode(Node.name(nodeToCheck), graph) && !Node.equal(unID(nodeToCheck), graph)) {
      throw new Error('Cannot add a node if the name is already used. Names must be unique in every compound. Tried to add node: ' + JSON.stringify(nodeToCheck))
    }
  }
}

/**
 * @function
 * @name addNodeByPath
 * @description Add a node at a specific path.
 * @param {CompoundPath} parentPath A compound path identifying the location in the compound graph.
 * @param {Node} node The node to add to the graph.
 * @param {PortGraph} graph The graph that is the root for the nodePath
 * @returns {PortGraph} A new graph that contains the node at the specific path.
 */
const addNodeByPath = curry((parentPath, nodeData, graph, ...cbs) => {
  const cb = flowCallback(cbs)
  var newNode
  var newGraph
  if (isRoot(parentPath)) {
    newGraph = addNodeInternal(nodeData, graph, checkNode, (n, g) => { newNode = n; return g })
  } else {
    let parentGraph = node(parentPath, graph)
    newGraph = replaceNode(parentPath, addNodeInternal(nodeData, parentGraph, checkNode, (n, g) => { newNode = n; return g }), graph)
  }
  return cb(newNode, newGraph)
})

/**
 * @function
 * @name addNodeIn
 * @description Add a node in a given compound node.
 * @param {Location} parentLoc A location identifying the parent for the new node.
 * @param {Node} node The node to add to the graph.
 * @param {PortGraph} graph The graph
 * @param {Callback} contextCallback A context-callback that is called after the new node was inserted. It
 * has the signature `Node x Graph -> Graph`. It will get the newly inserted node and the graph (that
 * has this node). And it must return a graph (the graph will be the return value of this function).
 * @returns {PortGraph} A new graph that contains the node as child of `parentLoc`.
 * @example <caption>Printing the id of the newly inserted node</caption>
 * Graph.addNodeIn(parent, {...}, graph, (newNode, graph) => {
 *   console.log(Node.id(newNode))
 *   return graph
 * })
 */
export const addNodeIn = curry((parentLoc, nodeData, graph, ...cbs) => {
  if (Node.isAtomic(node(parentLoc, graph))) {
    throw new Error('Cannot add Node to atomic node at: ' + graph.path)
  }
  return addNodeByPath(Node.path(createNode({}, node(parentLoc, graph))), nodeData, graph, ...cbs)
})

/**
 * @function
 * @name addNode
 * @description Add a node to the graph (at the root level), returns a new graph. [Performance O(|V| + |E|)]
 * @param {Node} node The node object that should be added. If the node already exists in the graph it will be copied.
 *   The node object must contain at least one valid ports. This functions checks if the node has ports AND if
 *   every port is a valid port (i.e. has a name as `port` and the port type (output/input) as `kind`).
 * @param {PortGraph} graph The graph.
 * @param {Callback} contextCallback A context-callback that is called after the new node was inserted. It
 * has the signature `Node x Graph -> Graph`. It will get the newly inserted node and the graph (that
 * has this node). And it must return a graph (the graph will be the return value of this function).
 * @returns {PortGraph} A new graph that includes the node.
 * @example <caption>Inserting nodes and connecting them</caption>
 * Graph.Let(
 *   [
 *     Graph.addNode({ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
 *     Graph.addNode({ports: [{port: 'in', kind: 'output', type: 'Number'}]})
 *   ],
 *   ([node1, node2], graph) =>
 *     Graph.addEdge({from: Node.port('out', node1), to: Node.port('in', node2)}, graph))
 * @example <caption>Printing the id of the newly inserted node</caption>
 * Graph.addNode({...}, graph, (newNode, graph) => {
 *   console.log(Node.id(newNode))
 *   return graph
 * })
 */
export const addNode = curry((node, graph, ...cbs) => {
  assertGraph(graph, 2, 'addNode')
  if (Node.isAtomic(graph)) {
    throw new Error('Cannot add Node to atomic node at: ' + graph.path)
  }
  return addNodeInternal(createNode({}, node), graph, checkNode, ...cbs)
})

export const addNodeWithID = curry((node, graph, ...cbs) => {
  assertGraph(graph, 2, 'addNode')
  return sequential([
    addNode(node),
    mergeNodes({id: node.id})
  ])(graph, ...cbs)
})

/**
 * @function
 * @name set
 * @description Sets properties for node.
 * @example
 * var graph = ...
 * var newGraph = Graph.set({property: value}, '#nodeIDOrLocation', graph)
 * // you can get the value via get in the newGraph
 * var propertyValue = Graph.get('property', '#nodeIDOrLocation', graph)
 * @param {Object} value The properties to set, e.g. `{recursion: true, recursiveRoot: true}`
 * @param {Location} loc The location identifying the node in which the property should be changed.
 * @param {PortGraph} graph The graph
 * @returns {PortGraph} A graph in which the change is realized.
 */
export const set = curry((value, loc, graph) => {
  assertGraph(graph, 3, 'set')
  var nodeObj = node(loc, graph)
  return replaceNode(nodeObj, Node.set(value, nodeObj), graph)
})

/**
 * @function
 * @name addNodeTuple
 * @description Add a node an return an array of the graph and id.
 * @param {Node} node The node object that should be added. If the node already exists in the graph it will be copied.
 * @param {PortGraph} graph The graph.
 * @returns {PortGraph} A new graph that includes the node and the id as an array in [graph, id].
 */
export const addNodeTuple = curry((node, graph) => {
  assertGraph(graph, 2, 'addNodeTuple')
  var id
  var newGraph = flow(
    Let(addNode(node), (node, graph) => {
      id = Node.id(node)
      return graph
    })
  )(graph)
  return [newGraph, id]
})

/**
 * @function
 * @name get
 * @description Get a property of a node.
 * @example
 * * var graph = ...
 * var newGraph = Graph.set({property: value}, '#nodeIDOrLocation', graph)
 * // you can get the value via get in the newGraph
 * var propertyValue = Graph.get('property', '#nodeIDOrLocation', graph)
 * @param {String} key The key of the property like 'recursion'
 * @param {Location} loc The location identifying the node for which the property is queried.
 * @param {PortGraph} graph The graph.
 * @returns The value of the property or undefined if the property does not exist in the node.
 */
export const get = curry((key, nodeQuery, graph) => Node.get(key, node(nodeQuery, graph)))

const removeNodeInternal = curry((query, deleteEdges, graph, ...cbs) => {
  const cb = flowCallback(cbs)
  var remNode = node(query, graph)
  var path = relativeTo(remNode.path, graph.path)
  var basePath = pathBase(path)
  if (basePath.length === 0) {
    var remEdgesGraph = graph
    if (deleteEdges) {
      var inc = incidents(path, graph)
      remEdgesGraph = inc.reduce((curGraph, edge) => removeEdge(edge, curGraph), graph)
    }
    return cb(remNode, changeSet.applyChangeSet(remEdgesGraph, changeSet.removeNode(remNode.id)))
  }
  var parentGraph = node(basePath, graph)
  // remove node in its compound and replace the graphs on the path
  return Let(removeNodeInternal(pathRest(path), deleteEdges), (remNode, newSubGraph) =>
    cb(remNode, replaceNode(basePath, newSubGraph, graph)))(parentGraph)
})

/**
 * @function
 * @name removeNode
 * @description Removes a node from the graph. [Performance O(|V| + |E|)]
 * @param {Location} loc The location identifying the node to delete.
 * @param {PortGraph} graph The graph.
 * @returns {PortGraph} A new graph without the given node.
 */
export const removeNode = curry((loc, graph, ...cbs) => {
  assertGraph(graph, 2, 'removeNode')
  if (parent(loc, graph) && Node.isAtomic(parent(loc, graph))) {
    throw new Error('Cannot remove child nodes of an atomic node. Tried deleting : ' + loc)
  }
  return removeNodeInternal(loc, true, graph, ...cbs)
})

function nodeParentPath (path, graph) {
  /* if (isCompoundPath(path)) {
    return pathParent(path)
  } else { */
  return relativeTo(pathParent(node(path, graph).path), graph.path)
  // }
}

/**
 * @function
 * @name replaceNode
 * @description Replace a node in the graph with another one. It tries to keep all edges.
 * @param {Location} loc A location specifying the node to replace
 * @param {Node} newNode The new node that replaces the old one.
 * @param {PortGraph} graph The graph
 * @returns {PortGraph} A new graph in which the old node was replaces by the new one.
 */
export const replaceNode = curry((loc, newNode, graph) => {
  assertGraph(graph, 3, 'replaceNode')
  var preNode = node(loc, graph)
  if (equal(preNode.path, graph.path)) return newNode
  return flow(
    Let(
        [removeNodeInternal(loc, false), addNodeByPath(nodeParentPath(loc, graph), newNode)],
        ([removedNode, insertedNode], graph) => mergeNodes(removedNode, insertedNode, graph)),
    rePath,
    (Node.isReference(preNode) && !Node.isReference(newNode)) ? realizeEdgesForNode(loc) : (graph) => graph,
    {name: '[replaceNode] For location ' + toString(loc)}
  )(graph)
})

/**
 * @function
 * @name setPortName
 * @description Updates a port of a node.
 * @param {Location} loc A location specifying the node to update.
 * @param {port} port The port name or its index.
 * @param {Port} portUpdate The new port object or parts of the new object (it will merge with the existing values).
 * @param {PortGraph} graph The graph
 * @returns {PortGraph} A new graph in which the port has been updated.
 * @throws {Error} If the location does not specify a node in the graph.
 */
export const setNodePort = curry((loc, port, portUpdate, graph) => {
  var nodeObj = node(loc, graph)
  return replaceNode(loc, Node.setPort(nodeObj, port, portUpdate), graph)
})

/**
 * @function
 * @name parent
 * @description Gets the parent of a node.
 * @param {Location} loc A location identifying the node whose parent is wanted.
 * @param {PortGraph} graph The graph.
 * @returns {Node} The node id of the parent node or undefined if the node has no parent.
 */
export const parent = curry((loc, graph) => {
  if (equal(node(loc, graph).path, graph.path)) {
    // parent points to a node not accessible from this graph (or loc is the root of the whole graph)
    return
  }
  return node(pathParent(relativeTo(node(loc, graph).path, graph.path)), graph)
})

/**
 * Replaces a port of a node in a graph
 * @param {Port} oldPort Port object to be replaced
 * @param {Port} newPort Port object to replace with. It will update the old port. Old attributes will not be overwritten.
 * @return {Portgraph} Updated graph with oldPort replaced by newPort
 */
export function replacePort (oldPort, newPort, graph) {
  const nodeObj = node(oldPort, graph)
  const newNode = merge(omit('ports', nodeObj), {ports: Node.ports(nodeObj)
    .map((port) =>
      (portName(port) === portName(oldPort))
      ? Object.assign({}, port, newPort)
      : port)
  })
  return replaceNode(nodeObj, newNode, graph)
}
