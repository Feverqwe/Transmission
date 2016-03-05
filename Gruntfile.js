module.exports = function (grunt) {
    var bgJsList = [
        'background.js'
    ];
    var dataJsList = [
        'mono.js',
        'manager.js',
        'notifer.js',
        'graph.js',
        'options.js',
        'selectBox.js',
        'jquery-2.1.3.min.js',
        'jquery.contextMenu.js',
        'd3.min.js',
        'bootstrap-colorpicker.js'
    ];
    grunt.initConfig({
        env: grunt.file.exists('env.json') ? grunt.file.readJSON('env.json') : {},
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            output: [
                '<%= output %>/*',
                '!<%= output %>/hash'
            ]
        },
        copy: {
            background: {
                cwd: 'src/js/',
                expand: true,
                src: bgJsList,
                dest: '<%= output %><%= vendor %><%= libFolder %>'
            },

            dataJs: {
                cwd: 'src/js/',
                expand: true,
                src: dataJsList,
                dest: '<%= output %><%= vendor %><%= dataJsFolder %>'
            },

            locales: {
                cwd: 'src/',
                expand: true,
                src: '_locales/**',
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            },

            baseData: {
                cwd: 'src/',
                expand: true,
                src: [
                    'css/**',
                    'images/**',
                    'manager.html',
                    'options.html'
                ],
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            }
        },

        // vars
        root: process.cwd().replace(/\\/g, '/') + '/',
        output: '<%= pkg.outputDir %>'
    });

    grunt.registerTask('compressJs', function() {
        var getHash = function(path, cb) {
            var fs = require('fs');
            var crypto = require('crypto');

            var fd = fs.createReadStream(path);
            var hash = crypto.createHash('sha256');
            hash.setEncoding('hex');

            fd.on('end', function () {
                hash.end();
                cb(hash.read());
            });

            fd.pipe(hash);
        };

        var done = this.async();

        var gruntTask = {
            closurecompiler: {
                minify: {
                    files: {},
                    options: {
                        jscomp_warning: 'const',
                        language_in: 'ECMASCRIPT5',
                        max_processes: 2
                    }
                }
            }
        };
        grunt.config.merge({closurecompiler: {
            minify: ''
        }});

        var wait = 0;
        var ready = 0;
        var hashList = {};

        var fileList = grunt.file.expand(grunt.template.process('<%= output %><%= vendor %>') + '**/*.js');
        fileList = fileList.filter(function(path) {
            if (/\.min\.js$/.test(path)) {
                return false;
            }
            return true;
        });

        var onReady = function() {
            ready++;
            if (wait !== ready) {
                return;
            }

            var copyFileList = [];
            var hashFolder = grunt.template.process('<%= output %>hash/');
            for (var hash in hashList) {
                var pathList = hashList[hash];
                var hashFilePath = hashFolder + hash + '.js';

                if (!grunt.file.exists(hashFilePath)) {
                    gruntTask.closurecompiler.minify.files[hashFilePath] = pathList[0];
                }

                pathList.forEach(function(path) {
                    copyFileList.push({src: hashFilePath, dest: path});
                });
            }

            grunt.config.merge(gruntTask);

            grunt.registerTask('copyFromCache', function() {
                copyFileList.forEach(function(item) {
                    grunt.file.copy(item.src, item.dest);
                });
            });

            grunt.task.run(['closurecompiler:minify', 'copyFromCache']);

            done();
        };

        fileList.forEach(function(path) {
            wait++;
            getHash(path, function(hash) {
                if (!hashList[hash]) {
                    hashList[hash] = [];
                }
                hashList[hash].push(path);
                onReady();
            });
        });
    });

    grunt.registerTask('monoPrepare', function() {
        "use strict";
        var path = grunt.template.process('<%= output %><%= vendor %><%= dataJsFolder %>');
        var fileName = 'mono.js';
        var content = grunt.file.read(path + fileName);
        var ifStrip = require('./grunt/ifStrip.js').ifStrip;
        content = ifStrip(content, grunt.config('monoParams') || {});
        content = content.replace(/\n[\t\s]*\n/g, '\n\n');
        grunt.file.write(path + fileName, content);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-json-format');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-closurecompiler');

    grunt.registerTask('extensionBase', ['copy:background', 'copy:dataJs', 'copy:baseData', 'copy:locales']);
    grunt.registerTask('buildJs', ['monoPrepare']);

    require('./grunt/chrome.js').run(grunt);
    require('./grunt/firefox.js').run(grunt);

    grunt.registerTask('default', [
        'clean:output',
        'chrome',
        'opera',
        'firefox'
    ]);
};