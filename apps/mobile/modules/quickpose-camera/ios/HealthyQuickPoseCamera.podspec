require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'HealthyQuickPoseCamera'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'Healthy'
  s.homepage       = 'https://github.com/nurulmasih/product'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/nurulmasih/product.git' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,swift}'

  s.dependency 'ExpoModulesCore'
  s.dependency 'QuickPoseCore'
  s.dependency 'QuickPoseCamera'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
