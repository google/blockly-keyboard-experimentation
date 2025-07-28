/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// We're mostly using the blockly-scripts for building, but we need a different
// webpack config for building for ghpages because the dev-scripts plugin
// doesn't surface the 'development' mode, which builds the test page. So we
// need to recreate the logic here. =(

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const fs = require('fs');
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const packageJson = require(resolveApp('package.json'));

// Base config that applies to either development or production mode.
const config = {
  entry: './test/index.ts',
  output: {
    // Compile the source files into a bundle.
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  // Enable webpack-dev-server to get hot refresh of the app.
  devServer: {
    static: './build',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        // Load CSS files. They can be imported into JS files.
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      'util': false,
    },
  },
  plugins: [
    // Generate the HTML index page based on our template.
    // This will output the same index page with the bundle we
    // created above added in a script tag.
    new HtmlWebpackPlugin({
      template: 'test/index.html',
    }),
    // Use DefinePlugin (https://webpack.js.org/plugins/define-plugin/)
    // to pass the name of the package being built to the dev-tools
    // playground (via plugins/dev-tools/src/playground/id.js).  The
    // "process.env."  prefix is arbitrary: the stringified value
    // gets substituted directly into the source code of that file
    // at build time.
    new webpack.DefinePlugin({
      'process.env.PACKAGE_NAME': JSON.stringify(packageJson.name),
    }),
  ],
};

module.exports = (env, argv) => {
  return config;
};
