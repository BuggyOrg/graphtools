
import flatten from 'lodash/fp/flatten'
import chunk from 'lodash/fp/chunk'
import curry from 'lodash/fp/curry'
import last from 'lodash/fp/last'
import {empty} from './basic'
import {debug} from '../debug'

function functionName (fn, options, idx) {
  if (options && options.names && options.names[idx]) return options.names[idx]
  if (fn.name && fn.name !== 'wrapper') return fn.name
}

function functionDescription (fn, options, idx) {
  if (options && options.descriptions && options.descriptions[idx]) return options.descriptions[idx]
  if (fn.description) return fn.description
}

function isOptionsObj (arg) {
  return !Array.isArray(arg) && typeof (arg) === 'object'
}

/**
 * @function
 * @name flow
 * @param {Function|Array} ...args An arbitrary number of arguments of that are either functions that
 * take one argument and return this argument. Or an array of functions that each take an argument and
 * return one. The functions must be composable.
 * @returns {Function} A function that takes an object that is fed into the first function in the arguments.
 */
export const flow = function () {
  var args = flatten(arguments)
  var lastArg = args[args.length - 1]
  var options
  if (isOptionsObj(lastArg)) {
    options = lastArg
    args = args.slice(0, -1)
  }
  var flowName = options && options.name
  return (graph) => {
    if (!graph) {
      graph = empty()
    }
    return [].reduce.call(args, (obj, fn, idx) => {
      try {
        var newGraph = fn(obj.graph, (data, graph) => graph)
        if (options && options.debug) debug(newGraph)
        return {graph: newGraph, store: obj.store}
      } catch (err) {
        var fnName = functionName(fn, options, idx)
        var fnDesc = functionDescription(fn, options, idx)
        err.message += ' in flow function ' + ((flowName) ? '"' + flowName + '"' : '') + ' (at position: ' + (idx + 1) + ')' +
          ((fnName) ? ' named ' + fnName : '') +
          ((fnDesc) ? ' (Description: "' + fnDesc + '")' : '')
        throw err
      }
    }, {graph, store: {}}).graph
  }
}

/**
 * @function
 * @name Let
 * @description
 * Handle the context information of an action in a separate callback. This is especially useful in flow chains
 * to preserve the monadic structure. This is similar to the monadic let in haskell (in do notations). As let
 * is already a JS keyword it is written in uppercase.
 * @param {GraphAction} fn A graph action that might produce some contextual information.
 * @param {Callback} cb A function that takes a context information and returns a graph action.
 * @returns {GraphAction} A graph action that takes a graph an produces a new graph.
 * @example Creating a node and using it in further actions
 * flow(
 *   Let(Graph.addNode({...}), (newNode, newGraph) =>
 *      Graph.addEdge({from: Node.port('x', newNode), to: '@out'})(newGraph))
 * )(graph)
 */
export const Let = (fn, cb, ...rest) => {
  if (rest.length > 0) throw new Error('Let takes exactly two arguments. If you want to perform multiple actions put them into an array (Graph.Let([...], callback).')
  return (graph) => {
    if (Array.isArray(fn)) {
      var res = []
      const arrCb = (idx) => (data, cbGraph) => {
        res[idx] = data
        return cbGraph
      }
      var resGraph = fn.reduce((gr, f, idx) => f(gr, arrCb(idx)), graph)
      return cb(res, resGraph)
    }
    return fn(graph, cb)
  }
}

/**
 * Utility function to get the callback function from an optional callbacks array.
 * This function should be used to allow for additional, optional arguments in curried functions.
 * @param cbs The callbacks array (possibly empty).
 * @returns The callback function for the callbacks array.
 */
export function flowCallback (cbs) {
  if (Array.isArray(cbs) && typeof (cbs[0]) === 'function') {
    return last(cbs.filter((cb) => typeof (cb) === 'function'))
  } else if (typeof (cbs) === 'function') {
    return cbs
  }
  return curry((data, graph, ...cbs) => {
    if (cbs && cbs.length > 0) return cbs[0](data, graph)
    return graph
  })
}

export const debugFlow = function () {
  var lastArg = arguments[arguments.length - 1]
  if (isOptionsObj(lastArg)) {
    return flow(...arguments.slice(0, -1), Object.assign(lastArg, {debug: true}))
  }
  return flow(...arguments, {debug: true})
}

/* unsure how to describe it properly... until now ;)
   only sensible usage scenario seems to be the `distribute`
*/
function parallel (fns) {
  if (fns.length === 0) return flowCallback()
  return (graph) => fns[0](graph, parallel(fns.slice(1)))
}

/**
 * Create a sequence of actions. Each action takes the result of the preceeding action and the current graph.
 * @param {Array<GraphActions>} fns An array of actions that are applied in sequence to the graph.
 * @returns {GraphAction} A function that takes a graph and returns a new graph. As with every GraphAction
 * it is possible to add a callback to the arguments to process the result with context information
 * @example Adding and removing a node
 * // in the first action, we specify the contents of the node.
 * // the second action gets the context information of the addNode (which is the added node)
 * // and the graph (i.e. it calls `Graph.removeNode(newNode, newGraph)`)
 * sequential([Graph.addNode({...}), Graph.removeNode])(graph)
 */
export function sequential (fns, opt = 0, cb = null) {
  if (fns.length === 0) return cb || flowCallback()
  if (typeof (fns[0]) !== 'function') throw new Error('[graphtools-sequential] Argument in sequence at position ' + (opt + 1) + ' is not a callable. Make sure to use curried functions.')
  return (...args) => {
    var called = false
    if (fns.length === 1) called = true
    var res
    if (opt === 0) {
      res = fns[0](args[0], (...innerArgs) => {
        called = true
        return sequential(fns.slice(1), opt + 1, args[1])(...innerArgs)
      })
      if (typeof (res) === 'function') {
        throw new Error('[graphtools-sequential] First call in sequential takes only the graph as an parameter. Function awaits more parameter.')
      }
    } else {
      res = fns[0](args[0], args[1], (...innerArgs) => {
        called = true
        return sequential(fns.slice(1), opt + 1, cb)(...innerArgs)
      })
      if (typeof (res) === 'function') {
        throw new Error('[graphtools-sequential] Calls in sequential (except the first call) take exactly two parameters, some payload and the graph. Function awaits more parameter than two.')
      }
    }
    if (!called) throw new Error('[graphtools-sequential] Callback function not called in sequence function at position ' + (opt + 1))
    return res
  }
}

/**
 * @function
 * @name distributeWith
 * @description
 * Distributes an argument over multiple Graph actions. After distributing it calls a reducer function.
 * @param {Reducer} reducer The reducer function that takes multiple graph actions and creates one action out of them.
 * This could be the sequential reducer that runs the actions sequentially (after distributing an argument).
 * @param {Array<GraphActions>} fns An array of actions onto which the given callback argument should be distributed.
 * @returns {GraphAction} A function that takes a graph and returns a new graph. As with every GraphAction
 * it is possible to add a callback to the arguments to process the result with context information
 * @example Connecting a nodes inputs and outputs
 * // Add a graph (`distributeWith(parallel)` is defined as `distribute`)
 * Graph.addNode({...}, distributeWith(parallel, [
 *    (newNode) => Graph.addEdge({from: '@from', to: Node.port('input', newNode)}),
 *    (newNode) => Graph.addEdge({from: Node.port('output', newNode), to: '@output'})
 * ])(graph)
 */
export const distributeWith = curry((reducer, fns) => {
  return (data, graph) => {
    if (!fns.every((f) => typeof (f) === 'function')) {
      throw new Error('[graphtools-distribute] Function ' + (fns.findIndex((f) => typeof (f) !== 'function') + 1) + ' is no function.')
    }
    const newFns = fns.map((f) => f(data))
    if (!newFns.every((f) => typeof (f) === 'function')) {
      throw new Error('[graphtools-distribute] Function ' + (newFns.findIndex((f) => typeof (f) !== 'function') + 1) + ' in distribute is not curried.')
    }
    return reducer(newFns)(graph)
  }
})

/**
 * @function
 * @name distribute
 * @description
 * Distributes an argument parallel. (Alias for `distributeWith(parallel)`).
 * @see distributeWith
 */
export const distribute = distributeWith(parallel)

/**
 * @function
 * @name distributeSequential
 * @description
 * Distributes an argument parallel. (Alias for `distributeWith(sequential)`).
 * @see distributeWith
 */
export const distributeSeq = distributeWith(sequential)

/**
 * @function
 * @name namedFlow
 * @deprecated
 * This function is deprecated. Use `flow` with and set the names via the optional parameter.
 */
export const namedFlow = function () {
  var lastArg = arguments[arguments.length - 1]
  var args = arguments
  var options = {}
  if (isOptionsObj(lastArg)) {
    options = lastArg
    args = args.slice(0, -1)
  }
  if (args.length % 2 !== 0) {
    throw new Error('Named flow must have an even number of arguments (and sub arguments) in the form [name, function, name function ...].')
  }
  const names = chunk(2, args).map((named) => named[0])
  const fns = chunk(2, args).map((named) => named[1])
  return flow(fns, Object.assign(options, {names}))
}
