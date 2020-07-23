const path = require("path");

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: {
    main: "./views"
  },
  output: {
    path: path.resolve(__dirname, "public"),
    filename: "[name].[chunkhash].chunk.js",
    chunkFilename: "[chunkhash].[id].js"
  },
  module: {
    rules: [
      {
        test: /\.css$/, 
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: "css-loader"
        })
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin({filename: "[name].css", allChunks: true}),
    new HtmlWebpackPlugin({template: "./src/index.html"})
  ]
}