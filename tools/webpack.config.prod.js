const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const fs = require('fs')

const nodeModules = {}
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod
  })

module.exports = {
  entry: './src/router.js',
  target: 'node',
  output: {
    path: "./build",
    filename: "server.min.js"
  },
  module: {
    loaders: [
      {test: /\.json$/, loader: "json-loader"},
      {test: /\.jsx?$/, exclude: /(node_modules)/, loader: 'babel-loader'}
    ]
  },
  externals: nodeModules,
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new CopyWebpackPlugin([
      {from: 'assets'}
    ]),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({mangle: false, sourcemap: false})
  ]
}
