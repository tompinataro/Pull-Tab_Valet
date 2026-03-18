#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const podspecPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-constants',
  'ios',
  'EXConstants.podspec'
);

const updatesPodspecPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-updates',
  'ios',
  'EXUpdates.podspec'
);

const podsProjectPath = path.join(
  __dirname,
  '..',
  'ios',
  'Pods',
  'Pods.xcodeproj',
  'project.pbxproj'
);

const requireNeedle = "require 'json'\n";
const requireReplacement = "require 'json'\nrequire 'shellwords'\n";

const envNeedle = `  env_vars = ENV['PROJECT_ROOT'] ? "PROJECT_ROOT=#{ENV['PROJECT_ROOT']} " : ""\n`;
const envReplacement = `  env_vars = ENV['PROJECT_ROOT'] ? "PROJECT_ROOT=#{ENV['PROJECT_ROOT'].shellescape} " : ""\n`;
const constantsScriptNeedle = `    :script => "bash -l -c \\"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"",\n`;
const constantsScriptReplacement = `    :script => "bash -l -c \\"#{env_vars}\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\"\\"",\n`;
const updatesScriptNeedle = `      :script => force_bundling_flag + 'bash -l -c "$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"',\n`;
const updatesScriptReplacement = `      :script => force_bundling_flag + 'bash -l -c "\\"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\\""',\n`;
const podsProjectConstantsNeedle = `shellScript = "bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"";`;
const podsProjectConstantsReplacement = `shellScript = "bash -l -c \\"\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\"\\"";`;
const podsProjectUpdatesNeedle = `shellScript = "bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\\"";`;
const podsProjectUpdatesReplacement = `shellScript = "bash -l -c \\"\\\\\\"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\\\\\\"\\"";`;

try {
  let changed = false;

  if (fs.existsSync(podspecPath)) {
    let source = fs.readFileSync(podspecPath, 'utf8');

    if (source.includes(requireNeedle) && !source.includes("require 'shellwords'\n")) {
      source = source.replace(requireNeedle, requireReplacement);
      changed = true;
    }

    if (source.includes(envNeedle)) {
      source = source.replace(envNeedle, envReplacement);
      changed = true;
    }

    if (source.includes(constantsScriptNeedle)) {
      source = source.replace(constantsScriptNeedle, constantsScriptReplacement);
      changed = true;
    }

    fs.writeFileSync(podspecPath, source, 'utf8');
  }

  if (fs.existsSync(updatesPodspecPath)) {
    let source = fs.readFileSync(updatesPodspecPath, 'utf8');
    if (source.includes(updatesScriptNeedle)) {
      source = source.replace(updatesScriptNeedle, updatesScriptReplacement);
      changed = true;
    }
    fs.writeFileSync(updatesPodspecPath, source, 'utf8');
  }

  if (fs.existsSync(podsProjectPath)) {
    let source = fs.readFileSync(podsProjectPath, 'utf8');
    if (source.includes(podsProjectConstantsNeedle)) {
      source = source.replace(podsProjectConstantsNeedle, podsProjectConstantsReplacement);
      changed = true;
    }
    if (source.includes(podsProjectUpdatesNeedle)) {
      source = source.replace(podsProjectUpdatesNeedle, podsProjectUpdatesReplacement);
      changed = true;
    }
    fs.writeFileSync(podsProjectPath, source, 'utf8');
  }

  if (changed) {
    console.log('[patch-expo-constants-podspec] Patched Expo iOS script phases for paths with spaces.');
  } else {
    console.log('[patch-expo-constants-podspec] No changes needed.');
  }
} catch (error) {
  console.warn('[patch-expo-constants-podspec] Failed to patch podspec:', error.message);
}
