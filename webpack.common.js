const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.v2.js',
    path: path.resolve(__dirname, 'docs')
  }
}
