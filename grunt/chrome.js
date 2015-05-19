exports.run = function (grunt) {
    grunt.config.merge({
        'json-format': {
            chromeManifestFormat: {
                expand: true,
                src: '<%= output %><%= vendor %>manifest.json',
                dest: '<%= output %><%= vendor %>',
                rename: function () {
                    return arguments[0] + arguments[1].substr((grunt.config('output') + grunt.config('vendor')).length);
                },
                options: {
                    indent: 4
                }
            }
        },
        compress: {
            chrome: {
                options: {
                    mode: 'zip',
                    archive: '<%= output %><%= vendor %>../<%= buildName %>.zip'
                },
                files: [{
                    expand: true,
                    filter: 'isFile',
                    src: '<%= output %><%= vendor %>/**',
                    dest: './',
                    rename: function () {
                        return arguments[0] + arguments[1].substr((grunt.config('output') + grunt.config('vendor')).length);
                    }
                }]
            }
        },
        copy: {
            chromeBase: {
                cwd: 'src/vendor/chrome/',
                expand: true,
                src: [
                    'js/**'
                ],
                dest: '<%= output %><%= vendor %>'
            }
        }
    });

    grunt.registerTask('chromeManifest', function() {
        var manifestPath = grunt.template.process('<%= output %><%= vendor %>manifest.json');
        var content = grunt.file.readJSON('src/manifest.json');
        content.version = grunt.config('pkg.extVersion');
        grunt.file.write(manifestPath, JSON.stringify(content));
    });

    grunt.registerTask('chrome', function () {
        grunt.config.merge({
            browser: 'chrome',
            vendor: 'chrome/src/',
            libFolder: 'js/',
            dataJsFolder: 'js/',
            includesFolder: 'includes/',
            dataFolder: '',
            buildName: 'TransmissionEasyClient_<%= pkg.extVersion %>'
        });

        grunt.task.run([
            'extensionBase',
            'copy:chromeBase',
            'chromeManifest',
            'compressJs',
            'json-format:chromeManifestFormat',
            'compress:chrome'
        ]);
    });

    grunt.registerTask('opera', function () {
        grunt.config.merge({
            browser: 'opera',
            vendor: 'opera/src/',
            libFolder: 'js/',
            dataJsFolder: 'js/',
            includesFolder: 'includes/',
            dataFolder: '',
            buildName: 'TransmissionEasyClient_opera_<%= pkg.extVersion %>'
        });

        grunt.task.run([
            'extensionBase',
            'copy:chromeBase',
            'chromeManifest',
            'compressJs',
            'json-format:chromeManifestFormat',
            'compress:chrome'
        ]);
    });
};