exports.run = function (grunt) {
    var replaceContent = function (content, sha1) {
        content = content.replace('%extVersion%', grunt.config('pkg.extVersion'));

        content = content.replace('%ffMinVersion%', grunt.config('pkg.ffMinVersion'));
        content = content.replace('%ffMaxVersion%', grunt.config('pkg.ffMaxVersion'));

        content = content.replace('%ffMMinVersion%', grunt.config('pkg.ffMinVersion'));
        content = content.replace('%ffMMaxVersion%', grunt.config('pkg.ffMaxVersion'));

        return content;
    };

    grunt.registerTask('fixFfJsJs', function () {
        grunt.config.merge({
            compress: {
                ffZipBuild: {
                    options: {
                        mode: 'zip',
                        archive: '<%= output %><%= vendor %>../<%= buildName %>.xpi'
                    },
                    files: [
                        {
                            cwd: '<%= output %><%= vendor %>../unzip/',
                            expand: true,
                            filter: 'isFile',
                            src: '**',
                            dest: './'
                        }
                    ]
                }
            },
            'json-format': {
                ffHarnessOptions: {
                    expand: true,
                    cwd: '<%= output %><%= vendor %>../unzip/',
                    src: 'harness-options.json',
                    dest: '<%= output %><%= vendor %>../unzip/',
                    options: {
                        indent: 2
                    }
                }
            }
        });

        var done = this.async();
        var buildPath = grunt.template.process('<%= output %><%= vendor %>../<%= buildName %>.xpi');
        var unZipPath = grunt.template.process('<%= output %><%= vendor %>../unzip/');

        var fs = require('fs');
        var unzip = require('unzip');

        fs.createReadStream(buildPath).pipe(unzip.Extract({
            path: unZipPath
        })).on('close', function () {
            var harnessOptionsPath = unZipPath + 'harness-options.json';
            var content = grunt.file.readJSON(harnessOptionsPath);
            for (var modulePath in content.manifest) {
                var module = content.manifest[modulePath];
                if (!module.moduleName || module.moduleName.slice(-3) !== '.js') continue;
                module.moduleName = module.moduleName.slice(0, -3);
            }
            grunt.file.write(harnessOptionsPath, JSON.stringify(content));

            grunt.task.run('json-format:ffHarnessOptions');

            grunt.task.run('compress:ffZipBuild');

            done();
        });
    });

    grunt.registerTask('ffRenameBuild', function () {
        var vendor = grunt.template.process('<%= output %><%= vendor %>../');
        var path = vendor + 'transmission_easy_client.xpi';
        grunt.file.copy(path, vendor + grunt.config('buildName') + '.xpi');
        grunt.file.delete(path);
    });

    grunt.registerTask('ffPackage', function() {
        var packagePath = grunt.template.process('<%= output %><%= vendor %>package.json');
        var content = grunt.file.readJSON('src/vendor/firefox/package.json');
        content.version = grunt.config('pkg.extVersion');
        grunt.file.write(packagePath, JSON.stringify(content));
    });

    grunt.config.merge({
        copy: {
            ffSleep: {
                cwd: 'src/',
                expand: true,
                src: [
                    'js/sleep.js',
                    'sleep.html'
                ],
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            },

            ffBase: {
                cwd: 'src/vendor/firefox/',
                expand: true,
                src: [
                    'locale/*',
                    'lib/*',
                    'data/**'
                ],
                dest: '<%= output %><%= vendor %>'
            },

            ffTemplateDir: {
                cwd: 'src/vendor/firefox_tools/template/',
                expand: true,
                src: '**',
                dest: '<%= output %><%= vendor %>/../template/',
                options: {
                    process: function (content, src) {
                        if (src.indexOf('install.rdf') !== -1) {
                            content = replaceContent(content);
                        }
                        return content;
                    }
                }
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
            buildFF: {
                command: 'cd <%= output %><%= vendor %> && call <%= env.addonSdkPath %>activate && cfx xpi --templatedir=../template --update-url "<%= ffUpdateUrl %>" && move *.xpi ../'
            }
        }
    });

    grunt.registerTask('firefox', function () {
        if (!grunt.config('env.addonSdkPath')) {
            console.error("Add-on SDK is not found!");
            return;
        }

        grunt.config.merge({
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
            'copy:ffBase',
            'copy:ffSleep',
            'ffPackage',
            'json-format:ffPackage',
            'copy:ffTemplateDir',
            'exec:buildFF',
            'ffRenameBuild',
            'fixFfJsJs'
        ]);
    });
};