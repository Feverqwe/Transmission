exports.run = function (grunt) {
    var monoParams = {
        browser: 'firefox'
    };

    grunt.registerTask('buildJpmFF', function() {
        "use strict";
        var Path = require('path');
        var async = this.async();
        var src = grunt.template.process('<%= output %><%= vendor %>');
        var cwd = Path.join(process.cwd(), src);

        return grunt.util.spawn({
            cmd: 'jpm',
            args: ['xpi'],
            opts: {
                cwd: cwd
            }
        }, function done(error, result, code) {
            console.log('Exit code:', code);
            result.stdout && console.log(result.stdout);
            result.stderr && console.log(result.stderr);

            if (error) {
                throw grunt.util.error('buildJpmFF error!');
            }

            return async();
        });
    });

    grunt.registerTask('ffPackageFormat', function() {
        "use strict";
        var src = grunt.template.process('<%= output %><%= vendor %>package.json');
        var json = grunt.file.readJSON(src);
        grunt.file.write(src, JSON.stringify(json, null, 4));
    });

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

    grunt.registerTask('ffJpmModInstallRdf', function() {
        "use strict";
        grunt.config.merge({
            compress: {
                ffZipBuild: {
                    options: {
                        mode: 'zip',
                        archive: '<%= output %><%= vendor %>../<%= buildName %>.xpi'
                    },
                    files: [{
                        expand: true,
                        filter: 'isFile',
                        cwd: '<%= output %><%= vendor %>../unzip/',
                        src: '**',
                        dest: ''
                    }]
                }
            }
        });

        var done = this.async();
        var vendor = grunt.template.process('<%= output %><%= vendor %>../');
        var buildPath = vendor + grunt.config('buildName') + '.xpi';
        var unZipPath = vendor + 'unzip/';

        var fs = require('fs');
        var unzip = require('unzip');

        fs.createReadStream(buildPath).pipe(unzip.Extract({
            path: unZipPath
        })).on('close', function() {
            var installRdfPath = unZipPath + 'install.rdf';
            var content = grunt.file.read(installRdfPath);

            var insert = function(text, target) {
                var insertPos = content.lastIndexOf(target) + target.length;

                var parts = [];
                parts.push(content.substr(0, insertPos));
                parts.push(text);
                parts.push(content.substr(insertPos));

                content = parts.join('');
            };

            insert([
                '\n', '<em:multiprocessCompatible>true</em:multiprocessCompatible>'
            ].join(''), '</em:optionsType>');


            grunt.file.write(installRdfPath, content);

            grunt.task.run('compress:ffZipBuild');

            done();
        });
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
        }
    });

    grunt.registerTask('firefox', function () {
        grunt.config('monoParams', monoParams);

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
            'ffPackageFormat',
            'buildJpmFF',
            'ffJpmRenameBuild',
            'ffJpmModInstallRdf'
        ]);
    });
};