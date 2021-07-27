const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.v3.js',
    path: path.resolve(__dirname, 'docs')
  }
}
