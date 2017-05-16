
var Graph = require('../lib/api')

/*
const testTime = (name, fn) => {
  console.time(name)
  fn()
  console.timeEnd(name)

  console.time(name + ' – after caching')
  fn()
  console.timeEnd(name + ' – after caching')
}

var graph = Graph.fromFile(__dirname + '/../fib-thunked-annotated.json')

testTime('nodesDeep', () => Graph.nodesDeep(graph))

var graph = Graph.fromFile(__dirname + '/../fib-thunked-annotated.json')

testTime('edgesDeep', () => Graph.edgesDeep(graph))
*/
/*
var graph = Graph.fromFile(__dirname + '/../fib-thunked-annotated.json')
const nodes = Graph.nodesDeep(graph)
const e = Graph.edgesDeep(graph)


console.time('all successors')
nodes.forEach((n) => {
  Graph.successorsNode(n, graph)
})
console.timeEnd('all successors')

console.time('all successors')
nodes.forEach((n) => {
  Graph.successorsNode(n, graph)
})
console.timeEnd('all successors')

// console.log('s ', nodes.length)

const comps = Graph.compounds(graph)

comps.forEach((c) => {
  console.time('topoSort')
  Graph.Algorithm.topologicalSort(c, graph)
  console.timeEnd('topoSort')
})

const ifNode = Graph.node('/ifThunk', graph)
const Node = Graph.Node
console.time('lca')
Graph.Algorithm.lowestCommonAncestors([Node.port('inTrue', ifNode), Node.port('inFalse', ifNode)], graph)
console.timeEnd('lca')
*/

var g1 = Graph.fromFile('./fib.json')

const c1 = Graph.compounds(g1)[0]
console.time('insert normal')
Graph.addNodeIn(c1, {ref: 'X'}, g1)
console.timeEnd('insert normal')

var g2 = Graph.fromFile('./fib.json')
g2.inplace = true

const c2 = Graph.compounds(g2)[0]
console.time('insert inplace')
Graph.addNodeIn(c2, {ref: 'X'}, g2)
console.timeEnd('insert inplace')
