exports.run = function (grunt) {
    var monoParams = {
        useFf: 1,
        oneMode: 1
    };

    grunt.registerTask('ffPackage', function() {
        var src = 'src/vendor/firefox/package.json';
        var content = grunt.file.readJSON(src);

        content.version = grunt.config('pkg.extVersion');

        var dest = grunt.template.process('<%= output %><%= vendor %>package.json');
        grunt.file.write(dest, JSON.stringify(content));
    });

    grunt.registerTask('ffJpmPackage', function () {
        "use strict";
        var vendor = grunt.template.process('<%= output %><%= vendor %>');

        var content = grunt.file.readJSON(vendor + 'package.json');

        grunt.file.copy(vendor + 'data/icons/icon-48.png', vendor + 'icon.png');
        grunt.file.copy(vendor + 'data/icons/icon-64.png', vendor + 'icon64.png');

        var engines = {};
        engines.firefox = '>=' + grunt.config('pkg.ffMinVersion') + ' <=' + grunt.config('pkg.ffMaxVersion');

        content.engines = engines;

        grunt.file.write(vendor + 'package.json', JSON.stringify(content));
    });

    grunt.registerTask('ffJpmRenameBuild', function() {
        var vendor = grunt.template.process('<%= output %><%= vendor %>');
        var fileList = grunt.file.expand(vendor + '*.xpi');
        var path = fileList[0];
        grunt.file.copy(path, vendor + '../' + grunt.config('buildName') + '.xpi');
        grunt.file.delete(path);
    });

    grunt.config.merge({
        copy: {
            ffBase: {
                cwd: 'src/vendor/firefox/',
                expand: true,
                src: [
                    'locale/*',
                    'lib/*',
                    'data/**'
                ],
                dest: '<%= output %><%= vendor %>'
            }
        },
        'json-format': {
            ffPackage: {
                cwd: '<%= output %><%= vendor %>',
                expand: true,
                src: 'package.json',
                dest: '<%= output %><%= vendor %>',
                options: {
                    indent: 4
                }
            }
        },
        exec: {
            buildJpmFF: {
                command: 'cd <%= output %><%= vendor %> && jpm xpi'
            }
        }
    });

    grunt.registerTask('firefox', function () {
        grunt.config('monoParams', monoParams);

        if (!grunt.config('env.addonSdkPath')) {
            console.error("Add-on SDK is not found!");
            return;
        }

        grunt.config.merge({
            browser: 'firefox',
            vendor: 'firefox/src/',
            libFolder: 'lib/',
            dataJsFolder: 'data/js/',
            includesFolder: 'data/includes/',
            dataFolder: 'data/',
            ffUpdateUrl: '',
            buildName: 'TransmissionEasyClient_<%= pkg.extVersion %>'
        });
        grunt.task.run([
            'extensionBase',
            'buildJs',
            'copy:ffBase',
            'ffPackage',
            'ffJpmPackage',
            'json-format:ffPackage',
            'exec:buildJpmFF',
            'ffJpmRenameBuild'
        ]);
    });
};