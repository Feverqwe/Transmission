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
        'bootstrap-colorpicker.js',
        'utils.js'
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

    grunt.registerTask('compressJs', function() {
        const fs = require('fs');
        const fse = require('fs-extra');
        const path = require('path');
        const crypto = require('crypto');
        const ClosureCompiler = require('google-closure-compiler').compiler;

        const callback = this.async();
        const hashDir = grunt.template.process('<%= output %>hash/');

        /**
         * @return {string[]}
         */
        const getFiles = function () {
            let fileList = grunt.file.expand(grunt.template.process('<%= output %><%= vendor %>') + '**/*.js');
            fileList = fileList.filter(function(path) {
                return !/\.min\.js$/.test(path);
            });
            return fileList;
        };

        /**
         * @param {string} filename
         * @param {string} alg
         * @return {Promise.<string>}
         */
        const getHash = function (filename, alg) {
            const self = this;
            return getStreamHash(fs.createReadStream(filename), alg);
        };

        /**
         * @param {Readable} stream
         * @param {string} alg
         * @return {Promise.<string>}
         */
        const getStreamHash = function (stream, alg) {
            return new Promise(function (resolve, reject) {
                stream
                    .on('error', function (err) {
                        reject(err);
                    })
                    .pipe(crypto.createHash(alg).setEncoding('hex'))
                    .on('error', function (err) {
                        reject(err);
                    })
                    .on('finish', function () {
                        resolve(this.read());
                    });
            });
        };

        /**
         * @param {string} src
         * @param {string} dest
         * @return {Promise}
         */
        const minifyFile = function (src, dest) {
            return new Promise(function (resolve, reject) {
                const closureCompiler = new ClosureCompiler({
                    js: src,
                    language_in: 'ECMASCRIPT5'
                });
                const compilerProcess = closureCompiler.run(function(exitCode, stdOut, stdErr) {
                    if (exitCode === 0) {
                        resolve(stdOut);
                    } else {
                        const err = new Error('closureCompiler error');
                        err.exitCode = exitCode;
                        err.stdOut = stdOut;
                        err.stdErr = stdErr;
                        reject(err)
                    }
                });
            }).then(function (data) {
                return fse.writeFile(dest, data);
            });
        };

        return Promise.resolve().then(function () {
            const fileList = getFiles();
            let promise = fse.ensureDir(hashDir);
            fileList.forEach(function (filename) {
                promise = promise.then(function () {
                    return getHash(filename, 'sha256').then(function (hash) {
                        const hashFilename = path.join(hashDir, hash + '.js');
                        return fse.access(hashFilename).catch(function (err) {
                            return minifyFile(filename, hashFilename);
                        }).then(function () {
                            return hashFilename;
                        });
                    }).then(function (hashFilename) {
                        return fse.copy(hashFilename, filename, {
                            overwrite: true
                        });
                    });
                });
            });
            return promise;
        }).then(callback);
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

    grunt.registerTask('default', [
        'clean:output',
        'chrome',
        'opera',
        'firefox'
    ]);
};