exports.run = function (grunt) {
    var monoParams = {
        useChrome: 1,
        oldChromeSupport: 1,
        oneMode: 1
    };

    grunt.config.merge({
        'json-format': {
            chromeManifestFormat: {
                expand: true,
                cwd: '<%= output %><%= vendor %>',
                src: 'manifest.json',
                dest: '<%= output %><%= vendor %>',
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
                    cwd: '<%= output %><%= vendor %>',
                    expand: true,
                    filter: 'isFile',
                    src: '**',
                    dest: ''
                }]
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
        grunt.config('monoParams', monoParams);

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
            'buildJs',
            'chromeManifest',
            'compressJs',
            'json-format:chromeManifestFormat',
            'compress:chrome'
        ]);
    });

    grunt.registerTask('opera', function () {
        grunt.config('monoParams', monoParams);

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
            'buildJs',
            'chromeManifest',
            'compressJs',
            'json-format:chromeManifestFormat',
            'compress:chrome'
        ]);
    });
};