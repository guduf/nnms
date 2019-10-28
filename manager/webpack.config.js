/* eslint-disable */
const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env['NODE_ENV'] === 'development';

const config = {
  mode: isDevelopment ? 'development' : 'production',
  watch: isDevelopment,
  entry: {
    bundle: path.join(__dirname, 'src/client/index.tsx')
  },
  output: {
    path: path.join(__dirname, './dist/client'),
    filename: '[name].js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.yaml'],
    plugins: [
      new TsConfigPathsPlugin({configFile: path.join(__dirname, './tsconfig.client.json')})
    ]
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        loader: 'awesome-typescript-loader',
        exclude: /node_modules/,
        options: {
          configFileName: path.join(__dirname, 'tsconfig.client.json'),
          useCache: isDevelopment,
          cacheDirectory: path.join(__dirname, './tmp/client-atl')
        }
      }, {
        test: /.js$/,
        loader: 'source-map-loader',
        enforce: 'pre',
      }
    ]
  },
  plugins: [
    new CopyPlugin([{
      from: path.join(__dirname, './assets/public'),
      to: 'assets',
      ignore: ['.gitkeep']
    }]),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        '**/*',
        path.join(__dirname, './tmp/client-atl')
      ]
    }),
    ...(
      isDevelopment ?
      [
        new HtmlWebpackPlugin({
          title: 'Webpack 4 Starter',
          template: path.join(__dirname, './index.dev.html'),
          inject: false
        })
      ] :
      []
    )
  ],
  devServer: {
    compress: true,
    index: 'index.html',
    port: 9000,
    historyApiFallback: true,
    publicPath: '/'
  }
};
module.exports = config;
