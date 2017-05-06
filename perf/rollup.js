const rollup = require('rollup')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')
const fs = require('fs')

rollup.rollup({
  entry: './src/api.js',
  plugins: [
    babel({
      plugins: ['transform-object-rest-spread'],
      exclude: 'node_modules/**'
    }),
    resolve(),
    commonjs()
  ]
})
.then((bundle) => {
  var result = bundle.generate({
    format: 'cjs'
  })

  fs.writeFileSync('./lib/apiBundle.js', result.code)

  // Alternatively, let Rollup do it for you
  // (this returns a promise). This is much
  // easier if you're generating a sourcemap
  bundle.write({
    format: 'cjs',
    dest: 'bundle.js'
  })
})
