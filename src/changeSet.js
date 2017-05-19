/** @module ChangeSet
 * @overview
 * This methods are for internal usage. They do not check for bad inputs and can create broken graphs.
 * If you know what you are doing you can include them via `import * as ChangeSet from '@buggyorg/graphtools/changeSet'`.
 */

/**
 * A change set contains information about how to transform a graph, e.g. insert an edge or modify a node.
 * @type ChangeSet
 */

import _ from 'lodash'
import _f from 'lodash/fp'
import * as Node from './node'
import * as Edge from './edge'
import * as Component from './component'
import {relativeTo} from './compoundPath'
import {access, store, forget, nodesDeep} from './graph/internal'

const hasChildren = Node.hasChildren

/**
 * Creates a change set to update a node with a given value
 * @param {string} node The identifier of the node.
 * @param {Object} mergeValue An object that contains parts of a node that should be set.
 * E.g. `{recursive: true}` will update the field `recursive` in the node and sets it to `true`.
 * @returns {ChangeSet} A change set containing the operation.
 */
export function updateNode (nodePath, mergeValue) {
  return {type: 'changeSet', operation: 'mergePath', query: nodePath, value: mergeValue}
}

/**
 * Creates a change set to replace a node with a given value
 * @param {string} node The identifier of the node.
 * @param {Object} mergeValue An object that contains a whole node that should be set.
 * E.g. `{recursive: true}` will update the field `recursive` in the node and sets it to `true`.
 * @returns {ChangeSet} A change set containing the operation.
 */
export function setNode (nodePath, setValue) {
  return {type: 'changeSet', operation: 'setPath', query: nodePath, value: setValue}
}

/**
 * Creates a change set that creates a new node.
 * @param {Object} value The new node.
 * @returns {ChangeSet} A change set containing the new node.
 */
export function insertNode (value, path = []) {
  return {type: 'changeSet', operation: 'insert', query: 'nodes', value, path}
}

export function removeNode (id) {
  return {type: 'changeSet', operation: 'remove', query: 'nodes', filter: (n) => Node.equal(n, id)}
}

/**
 * Creates a change set that creates a new component.
 * @param {Object} value The new component.
 * @returns {ChangeSet} A change set containing the new component.
 */
export function insertComponent (value) {
  return {type: 'changeSet', operation: 'insert', query: 'components', value}
}

/**
 * Creates a change set to update a component with a given value
 * @param {string} compId The componentId of the component.
 * @param {Object} mergeValue An object that contains parts of a component that should be set.
 * E.g. `{isType: true}` will update the field `isType` in the component and sets it to `true`.
 * @returns {ChangeSet} A change set containing the operation.
 */
export function updateComponent (compId, mergeValue) {
  return {type: 'changeSet', operation: 'mergeComponent', query: compId, value: mergeValue}
}

export function removeComponent (id) {
  return {type: 'changeSet', operation: 'remove', query: 'components', filter: (n) => Component.equal(n, id)}
}

export function addMetaInformation (key, value) {
  return {type: 'changeSet', operation: 'setKey', query: 'metaInformation', key, value}
}

export function setMetaInformation (meta) {
  return {type: 'changeSet', operation: 'set', query: 'metaInformation', value: meta}
}

export function removeMetaInformation (key) {
  return {type: 'changeSet', operation: 'removeKey', query: 'metaInformation', key}
}

export function empty () {
  return {type: 'changeSet', opertaion: 'none'}
}

/**
 * Creates a change set that inserts a new edge into the edge list
 * @param {Object} newEdge The edge that should be inserted.
 * @returns {ChangeSet} A change set containing the insertion operation.
 */
export function insertEdge (newEdge) {
  return {type: 'changeSet', operation: 'insert', query: 'edges', value: newEdge}
}

/**
 * Creates a change set that inserts a new edge into the edge list
 * @param {Object} newEdge The edge that should be inserted.
 * @returns {ChangeSet} A change set containing the insertion operation.
 */
export function updateEdge (edge, mergeEdge) {
  return {type: 'changeSet', operation: 'mergeEdge', query: edge, value: mergeEdge}
}

/**
 * Creates a change set that removes the edge `edge`.
 * @param {Object} edge The edge to remove.
 * @returns {ChangeSet} The change set containing the deletion operation.
 */
export function removeEdge (edge) {
  return {type: 'changeSet', operation: 'remove', query: 'edges', filter: _.partial(Edge.equal, edge)}
}

/**
 * Checks whether a value is a change set or not.
 * @param changeSet The value that should be checked.
 * @returns True if it is a changeSet, false otherwise.
 */
export function isChangeSet (changeSet) {
  return typeof (changeSet) === 'object' && changeSet.type === 'changeSet'
}

const applySetKey = (r, key, value) => {
  const v = _.get(r, key)
  if (typeof (v) === 'object' && typeof (value) === 'object') {
    return _f.set(key, _.merge(_.get(r, key), value), r)
  } else {
    return _f.set(key, value, r)
  }
}

const applyMergeByPath = (graph, path, value) => {
  var idx = _.findIndex(graph.nodes, Node.equal(path[0]))
  if (path.length === 1) {
    if (idx > -1) {
      return {
        ...graph,
        nodes: graph.nodes.map((i, itemIdx) => {
          if (idx === itemIdx) return _f.merge(i, value)
          return i
        })
      }
    }
  } else {
    if (idx > -1 && (hasChildren(graph.nodes[idx]))) {
      return {
        ...graph,
        nodes: graph.nodes.map((i, itemIdx) => {
          if (idx === itemIdx) return applyMergeByPath(i, path.slice(1), value)
          return i
        })
      }
    }
  }
}

const updateValue = (what, value, graph) => {
  var val = access(what, graph)
  if (val) {
    for (var idx in val) {
      if (val[idx].id === value.id) {
        val[idx] = value
        break
      }
    }
    store(val, what, graph)
  }
}

const setNodeByPath = (graph, path, value) => {
  var cur = graph
  for (var i = 0; i < path.length - 1; i++) {
    let idx = _.findIndex(cur.nodes, Node.equal(path[i]))
    cur = cur.nodes[idx]
  }
  let idx = _.findIndex(cur.nodes, Node.equal(path[path.length - 1]))
  cur.nodes[idx] = value
  updateValue('nodesDeep', value, graph)
  forget('edgesDeep', graph)
  updateValue('nodes', value, cur)
  forget('edges', cur)
  store(value, value.id, graph)
}

const getPath = (graph, path) => {
  if (path.length === 0) return graph
  var cur = graph
  for (var i = 0; i < path.length - 1; i++) {
    let idx = _.findIndex(cur.nodes, Node.equal(path[i]))
    cur = cur.nodes[idx]
  }
  let idx = _.findIndex(cur.nodes, Node.equal(path[path.length - 1]))
  return cur.nodes[idx]
}

const applySetByPath = (graph, path, value) => {
  if (graph.inplace) {
    setNodeByPath(graph, path, value)
    return graph
  }
  var idx = _.findIndex(graph.nodes, Node.equal(path[0]))
  if (path.length === 1) {
    if (idx > -1) {
      return {
        ...graph,
        nodes: graph.nodes.map((i, itemIdx) => {
          if (idx === itemIdx) return value
          return i
        })
      }
    }
  } else {
    if (idx > -1 && (hasChildren(graph.nodes[idx]))) {
      return {
        ...graph,
        nodes: graph.nodes.map((i, itemIdx) => {
          if (idx === itemIdx) return applySetByPath(i, path.slice(1), value)
          return i
        })
      }
    }
  }
}

const applyMergeByComponent = (graph, cId, value) => {
  var idx = _.findIndex(graph.components, (c) => Component.id(c) === cId)
  return {
    ...graph,
    components: graph.components.map((c, cIdx) => {
      if (idx === cIdx) return _f.merge(c, value)
      return c
    })
  }
}

const applyMergeByEdge = (graph, edge, value) => {
  var idx = _.findIndex(graph.edges, (e) => Edge.equal(edge, e))
  return {
    ...graph,
    edges: graph.edges.map((e, eIdx) => {
      if (idx === eIdx) return _f.merge(e, value)
      return e
    })
  }
}

const updatePush = (what, value, graph) => {
  var val = access(what, graph)
  if (val) {
    val.push(value)
    store(val, what, graph)
  }
}

const insertInGraph = (what, where, value, graph) => {
  if (graph.inplace && what === 'nodes') {
    var node = getPath(graph, where)
    node[what].push(value)
    const newNodes = nodesDeep(value)
    for (node of newNodes) {
      updatePush('nodesDeep', node, graph)
      updatePush('nodes', node, node)
      store(node, node.id, graph)
    }
    return graph
  }
  if (Array.isArray(where) && relativeTo(where, graph.path).length !== 0) throw new Error('Cannot insert deep without modifications. Path = ' + where)
  return {
    ...graph,
    [what]: [ ...graph[what], value ]
  }
}

/**
 * Apply a changeSet on the given graph.
 * @param {Object} graph The graph in JSON format that should be changed.
 * @param {ChangeSet} changeSet The change set that should be applied.
 * @returns {Graphlib} A new graph with the applied change set graph.
 * @throws {Error} If the change set is no valid change set it throws an error.
 */
export function applyChangeSet (graph, changeSet) {
  // var newGraph = _.cloneDeep(graph)
  return applyChangeSetInplace(graph, changeSet)
}

/**
 * Apply an array of changeSets on the given graph. All changes are applied sequentially.
 * @param {PortGraph} graph The graph that should be changed.
 * @param {ChangeSet[]} changeSets The change sets that should be applied. The order might influence the resulting graph, they are processesed sequentially.
 * @returns {Graphlib} A new graph with the applied change set graph.
 * @throws {Error} If the change set is no valid change set it throws an error.
 */
export function applyChangeSets (graph, changeSets) {
  // var newGraph = _.cloneDeep(graph)
  return changeSets.reduce((g, c) => applyChangeSetInplace(g, c), graph)
}

/**
 * Apply a changeSet on the given graph inplace.
 * @param {PortGraph} graph The graph that should be changed.
 * @param {ChangeSet} changeSet The change set that should be applied.
 * @returns {Graphlib} The changed graph. Currently the changes are all made inplace so the return value is equal to the input graph.
 * @throws {Error} If the change set is no valid change set it throws an error.
 */
export function applyChangeSetInplace (graph, changeSet) {
  if (!isChangeSet(changeSet)) {
    throw new Error('Cannot apply non-ChangeSet ' + JSON.stringify(changeSet))
  } else if (changeSet.operation === 'mergePath') {
    return applyMergeByPath(graph, changeSet.query, changeSet.value)
  } else if (changeSet.operation === 'setPath') {
    return applySetByPath(graph, changeSet.query, changeSet.value)
  } else if (changeSet.operation === 'mergeComponent') {
    return applyMergeByComponent(graph, changeSet.query, changeSet.value)
  } else if (changeSet.operation === 'mergeEdge') {
    return applyMergeByEdge(graph, changeSet.query, changeSet.value)
  } else if (changeSet.operation === 'insert') {
    return insertInGraph(changeSet.query, changeSet.path, changeSet.value, graph)
  } else if (changeSet.operation === 'remove') {
    return {
      ...graph,
      [changeSet.query]: graph[changeSet.query].filter((n) => !changeSet.filter(n))
    }
  } else if (changeSet.operation === 'set') {
    return _f.set(changeSet.query, changeSet.value, graph)
  } else if (changeSet.operation === 'setKey') {
    return applySetKey(graph, changeSet.query + '.' + changeSet.key, changeSet.value)
  } else if (changeSet.operation === 'removeKey') {
    return _f.unset(changeSet.query + '.' + changeSet.key, graph)
    // return graph
  }
  return graph
}
