// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow metro to bundle .xlsx files as binary assets
config.resolver.assetExts.push('xlsx');

module.exports = config;
