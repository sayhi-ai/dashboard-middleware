const webpack = require('webpack')

module.exports = {
  entry: "./src/index.js",
  target: 'node',
  module: {
    loaders: [
      {test: /\.json$/, loader: "json-loader"},
      {test: /\.jsx?$/, exclude: /(node_modules)/, loader: 'babel'}
    ]
  },
  output: {
    path: "./lib",
    filename: "lib.min.js",
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    })
  ]
}
