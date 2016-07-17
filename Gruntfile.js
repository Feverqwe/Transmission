module.exports = function (grunt) {
    var bgJsList = [
        'background.js'
    ];
    var dataJsList = [
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
        output: '<%= pkg.outputDir %>'
    });

    require('google-closure-compiler').grunt(grunt);
    grunt.registerTask('compressJs', function() {
        var fs = require('fs');
        var crypto = require('crypto');

        var done = this.async();

        var getHash = function(path, cb) {
            var fd = fs.createReadStream(path);
            var hash = crypto.createHash('sha256');
            hash.setEncoding('hex');
            fd.on('end', function () {
                hash.end();
                cb(hash.read());
            });
            fd.pipe(hash);
        };

        var gruntTask = {
            'closure-compiler': {
                minify: {
                    files: {},
                    options: {
                        language_in: 'ECMASCRIPT5'
                    }
                }
            }
        };

        grunt.config.merge({'closure-compiler': {
            minify: ''
        }});

        var wait = 0;
        var ready = 0;
        var hashList = {};

        var fileList = grunt.file.expand(grunt.template.process('<%= output %><%= vendor %>') + '**/*.js');
        fileList = fileList.filter(function(path) {
            return !/\.min\.js$/.test(path);
        });

        var ccFiles = gruntTask['closure-compiler'].minify.files;
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
                    ccFiles[hashFilePath] = pathList[0];
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

            var tasks = ['copyFromCache'];
            if (Object.keys(ccFiles).length) {
                tasks.unshift('closure-compiler:minify');
            }

            grunt.task.run(tasks);

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
        var config = grunt.config('monoParams') || {};
        var monoPath = './src/vendor/mono/' + config.browser + '/mono.js';

        var content = grunt.file.read(monoPath);
        var utils = grunt.file.read('./src/js/monoUtils.js');

        content = content.replace(/\/\/@insert/, utils);

        var path = grunt.template.process('<%= output %><%= vendor %><%= dataJsFolder %>');
        var fileName = 'mono.js';
        grunt.file.write(path + fileName, content);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');

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